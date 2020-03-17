import { AicsGridCell } from "@aics/aics-react-labkey";
import { stat as fsStat, Stats } from "fs";
import { uniq } from "lodash";
import { basename, dirname, resolve as resolvePath } from "path";
import { createLogic } from "redux-logic";
import { promisify } from "util";
import { OPEN_TEMPLATE_EDITOR } from "../../../shared/constants";

import { GridCell } from "../../components/AssociateWells/grid-cell";
import { canUserRead, getWithRetry } from "../../util";

import { removeRequestFromInProgress, setAlert, startLoading, stopLoading } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { receiveMetadata } from "../metadata/actions";
import { selectPage } from "../route/actions";
import { getNextPage } from "../route/constants";
import { getPage } from "../route/selectors";
import { Page } from "../route/types";
import { associateByWorkflow } from "../setting/actions";
import { clearTemplateDraft, getTemplate } from "../template/actions";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicRejectCb,
    ReduxLogicTransformDependencies,
} from "../types";
import { clearUpload } from "../upload/actions";
import { getUpload } from "../upload/selectors";
import { batchActions, getActionFromBatch } from "../util";

import {
    deselectFiles,
    selectImagingSessionId,
    selectWells,
    setPlate,
    setWells,
    stageFiles,
    updateStagedFiles,
} from "./actions";
import {
    CLEAR_STAGED_FILES, CLOSE_MODAL,
    GET_FILES_IN_FOLDER,
    LOAD_FILES,
    OPEN_FILES,
    SELECT_BARCODE,
    SELECT_WELLS,
    SELECT_WORKFLOW_PATH,
} from "./constants";
import { UploadFileImpl } from "./models/upload-file";
import {
    getSelectedBarcode,
    getStagedFiles,
    getWellsWithModified,
} from "./selectors";
import { DragAndDropFileList, GetPlateResponse, PlateResponse, UploadFile, WellResponse } from "./types";

const stat = promisify(fsStat);

const mergeChildPaths = (filePaths: string[]): string[] => {
    filePaths = uniq(filePaths);

    return filePaths.filter((filePath) => {
        const otherFilePaths = filePaths.filter((otherFilePath) => otherFilePath !== filePath);
        return !otherFilePaths.find((otherFilePath) => filePath.indexOf(otherFilePath) === 0);
    });
};

const getUploadFilePromise = async (name: string, path: string): Promise<UploadFile> => {
    const fullPath = resolvePath(path, name);
    const stats: Stats = await stat(fullPath);
    const isDirectory = stats.isDirectory();
    const canRead = await canUserRead(fullPath);
    const file = new UploadFileImpl(name, path, isDirectory, canRead);
    if (isDirectory && canRead) {
        file.files = await Promise.all(await file.loadFiles());
    }
    return file;
};

const stageFilesAndStopLoading = async (uploadFilePromises: Array<Promise<UploadFile>>,
                                        currentPage: Page,
                                        dispatch: ReduxLogicNextCb,
                                        done: ReduxLogicDoneCb) => {
    try {
        const uploadFiles = await Promise.all(uploadFilePromises);
        dispatch(batchActions([
            stopLoading(),
            stageFiles(uploadFiles),
        ]));
        if (currentPage === Page.DragAndDrop) {
            dispatch(selectPage(currentPage, getNextPage(currentPage, 1) || Page.SelectUploadType));
        }
        done();

    } catch (e) {
        dispatch(batchActions([
            stopLoading(),
            setAlert({
                message: `Encountered error while resolving files: ${e}`,
                type: AlertType.ERROR,
            }),
        ]));
        done();
    }
};

const loadFilesLogic = createLogic({
    process: async ({ action, getState }: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        dispatch(startLoading());
        const filesToLoad: DragAndDropFileList = action.payload;

        const uploadFilePromises: Array<Promise<UploadFile>> = Array.from(filesToLoad, (fileToLoad) => (
            getUploadFilePromise(fileToLoad.name, dirname(fileToLoad.path))
        ));

        await stageFilesAndStopLoading(uploadFilePromises, getPage(getState()), dispatch, done);
    },
    type: LOAD_FILES,
});

const openFilesLogic = createLogic({
    process: async ({ action, getState }: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        dispatch(startLoading());
        const filesToLoad: string[] = mergeChildPaths(action.payload);

        const uploadFilePromises: Array<Promise<UploadFile>> = filesToLoad.map((filePath: string) => (
            getUploadFilePromise(basename(filePath), dirname(filePath))
        ));

        await stageFilesAndStopLoading(uploadFilePromises, getPage(getState()), dispatch, done);
    },
    type: OPEN_FILES,
});

const getNewStagedFiles = (files: UploadFile[], fileToUpdate: UploadFile): UploadFile[] => {
    return files.map((file: UploadFile) => {
        if (file.fullPath === fileToUpdate.fullPath) {
            return fileToUpdate;
        } else if (fileToUpdate.fullPath.indexOf(file.fullPath) === 0) {
            file.files = getNewStagedFiles(file.files, fileToUpdate);
            return file;
        }

        return file;
    });
};

const getFilesInFolderLogic = createLogic({
    transform: async ({ action, getState }: ReduxLogicTransformDependencies,
                      next: ReduxLogicNextCb) => {
        const folder: UploadFile = action.payload;
        try {
            folder.files = await Promise.all(await folder.loadFiles());
            const stagedFiles = [...getStagedFiles(getState())];
            next(updateStagedFiles(getNewStagedFiles(stagedFiles, folder)));
        } catch (e) {
           next(setAlert({
               message: `Encountered error while resolving files: ${e}`,
               type: AlertType.ERROR,
           }));
        }
    },
    type: GET_FILES_IN_FOLDER,
});

export const GENERIC_GET_WELLS_ERROR_MESSAGE = (barcode: string) => `Could not retrieve wells for barcode ${barcode}`;

const selectBarcodeLogic = createLogic({
    process: async ({ action, getState, labkeyClient, logger, mmsClient }: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const { barcode, imagingSessionIds } = action.payload;
        const request = (): Promise<GetPlateResponse[]> => Promise.all(
            imagingSessionIds.map((imagingSessionId: number) => mmsClient.getPlate(barcode, imagingSessionId))
        );

        try {
            const platesAndWells: GetPlateResponse[] = await getWithRetry(
                request,
                AsyncRequest.GET_PLATE,
                dispatch,
                "MMS",
                GENERIC_GET_WELLS_ERROR_MESSAGE(action.payload.barcode)
            );

            const imagingSessionIdToPlate: {[imagingSessionId: number]: PlateResponse} = {};
            const imagingSessionIdToWells: {[imagingSessionId: number]: WellResponse[]} = {};
            imagingSessionIds.forEach((imagingSessionId: number, i: number) => {
                imagingSessionId = !imagingSessionId ? 0 : imagingSessionId;
                const { plate, wells } = platesAndWells[i];
                imagingSessionIdToPlate[imagingSessionId] = plate;
                imagingSessionIdToWells[imagingSessionId] = wells;
            });

            const actions = [
                selectImagingSessionId(imagingSessionIds[0]),
                setPlate(imagingSessionIdToPlate),
                setWells(imagingSessionIdToWells),
                removeRequestFromInProgress(AsyncRequest.GET_PLATE),
                associateByWorkflow(false),
                receiveMetadata({barcodeSearchResults: []}),
            ];
            const nextPage = getNextPage(Page.SelectUploadType, 1) || Page.AssociateFiles;
            dispatch(batchActions(actions));
            dispatch(selectPage(Page.SelectUploadType, nextPage));
        } catch (e) {
            logger.error(e.message);
        }

        done();
    },
    type: SELECT_BARCODE,
});

const selectWorkflowPathLogic = createLogic({
    process: async (deps: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const action = getActionFromBatch(deps.action, SELECT_WORKFLOW_PATH);

        if (action) {
            const actions = [
                action,
                associateByWorkflow(true),
            ];
            const nextPage = getNextPage(Page.SelectUploadType, 1) || Page.AssociateFiles;
            dispatch(batchActions(actions));
            dispatch(selectPage(Page.SelectUploadType, nextPage));
        }
        done();
    },
    type: SELECT_WORKFLOW_PATH,
});

const openTemplateEditorLogic = createLogic({
    process: ({action}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        if (action.payload) {
            dispatch(getTemplate(action.payload));
        }

        done();
    },
    type: OPEN_TEMPLATE_EDITOR,
});

const closeModalLogic = createLogic({
   transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
       if (action.payload === "templateEditor") {
           next(batchActions([
               clearTemplateDraft(),
               action,
           ]));
       } else {
           next(action);
       }
   },
    type: CLOSE_MODAL,
});

const selectWellsLogic = createLogic({
    transform: ({ action, getState }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const wells = getWellsWithModified(getState());
        const cells = action.payload;
        const filledCells = cells.filter((cell: AicsGridCell) => wells[cell.row][cell.col].modified);
        const gridCells = filledCells.map((cell: AicsGridCell) => new GridCell(cell.row, cell.col));
        next(selectWells(gridCells));
    },
    type: SELECT_WELLS,
});

const clearStagedFilesLogic = createLogic({
    type: CLEAR_STAGED_FILES,
    validate: ({ action, dialog, getState }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
               reject: ReduxLogicRejectCb) => {
        const uploads = getUpload(getState());

        if (Object.keys(uploads).length) {
            const barcode = getSelectedBarcode(getState());
            const associationType = barcode ? "well" : "workflow";
            dialog.showMessageBox({
                buttons: ["Cancel", "Clear All Files And Associations"],
                cancelId: 0,
                defaultId: 1,
                message: `You have files with ${associationType} associations. How would you like to proceed?`,
                title: "Warning",
                type: "warning",
            }, (buttonIndex: number) => {
                if (buttonIndex === 0) { // cancel
                    // The types for redux-logic expect an action to be passed to the reject callback.
                    // Since we don't want to do anything, we're sending a dummy action
                    reject({type: "ignore"});
                } else { // clear everything
                    next(batchActions([
                        action,
                        clearUpload(),
                        deselectFiles(),
                    ]));
                }
            });
        }
    },
});

export default [
    clearStagedFilesLogic,
    closeModalLogic,
    loadFilesLogic,
    openTemplateEditorLogic,
    openFilesLogic,
    getFilesInFolderLogic,
    selectBarcodeLogic,
    selectWellsLogic,
    selectWorkflowPathLogic,
];
