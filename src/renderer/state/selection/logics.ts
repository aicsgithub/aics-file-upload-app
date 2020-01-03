import { stat as fsStat, Stats } from "fs";
import { uniq } from "lodash";
import { basename, dirname, resolve as resolvePath } from "path";
import { createLogic } from "redux-logic";
import { promisify } from "util";
import { CLOSE_TEMPLATE_EDITOR, OPEN_TEMPLATE_EDITOR } from "../../../shared/constants";

import { canUserRead } from "../../util";

import { API_WAIT_TIME_SECONDS } from "../constants";
import {
    addRequestToInProgress,
    clearAlert,
    removeRequestFromInProgress,
    setAlert,
    startLoading,
    stopLoading
} from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { receiveMetadata } from "../metadata/actions";
import { selectPage } from "../route/actions";
import { getNextPage } from "../route/constants";
import { getPage } from "../route/selectors";
import { Page } from "../route/types";
import { associateByWorkflow } from "../setting/actions";
import { clearTemplateDraft, getTemplate } from "../template/actions";
import {
    HTTP_STATUS,
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions, getActionFromBatch } from "../util";

import {
    setPlate,
    setWells,
    stageFiles,
    updateStagedFiles,
} from "./actions";
import {
    GET_FILES_IN_FOLDER,
    LOAD_FILES,
    OPEN_FILES,
    SELECT_BARCODE,
    SELECT_WORKFLOW_PATH,
} from "./constants";
import { UploadFileImpl } from "./models/upload-file";
import { getStagedFiles } from "./selectors";
import {
    DragAndDropFileList,
    UploadFile
} from "./types";

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
export const MMS_IS_DOWN_MESSAGE = "Could not contact server. Make sure MMS is running.";
export const MMS_MIGHT_BE_DOWN_MESSAGE = "Server might be down. Retrying GET wells request...";

const selectBarcodeLogic = createLogic({
    process: async ({ action: batchedAction, getState, mmsClient, remote }: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const action = getActionFromBatch(batchedAction, SELECT_BARCODE);

        if (!action) {
            done();
        } else {
            const { barcode, imagingSessionId } = action.payload;
            const startTime = (new Date()).getTime() / 1000;
            let currentTime = startTime;
            let receivedSuccessfulResponse = false;
            let receivedNonGatewayError = false;
            let sentRetryAlert = false;

            while ((currentTime - startTime < API_WAIT_TIME_SECONDS) && !receivedSuccessfulResponse
            && !receivedNonGatewayError) {
                try {
                    const { plate, wells } = await mmsClient.getPlate(barcode, imagingSessionId);
                    receivedSuccessfulResponse = true;
                    const actions = [
                        setPlate(plate),
                        setWells(wells),
                        removeRequestFromInProgress(AsyncRequest.GET_PLATE),
                        action,
                        associateByWorkflow(false),
                        receiveMetadata({barcodeSearchResults: []}),
                    ];
                    const nextPage = getNextPage(Page.SelectUploadType, 1) || Page.AssociateFiles;
                    dispatch(batchActions(actions));
                    dispatch(selectPage(Page.SelectUploadType, nextPage));
                } catch (e) {
                    if (e.response && e.response.status === HTTP_STATUS.BAD_GATEWAY) {
                        if (!sentRetryAlert) {
                            dispatch(
                                setAlert({
                                    manualClear: true,
                                    message: MMS_MIGHT_BE_DOWN_MESSAGE,
                                    type: AlertType.WARN,
                                })
                            );
                            sentRetryAlert = true;
                        }
                    } else {
                        receivedNonGatewayError = true;
                    }
                } finally {
                    currentTime = (new Date()).getTime() / 1000;
                }
            }

            if (receivedSuccessfulResponse) {
                if (sentRetryAlert) {
                    dispatch(clearAlert());
                }

                done();
            } else {
                const message = sentRetryAlert ? MMS_IS_DOWN_MESSAGE :
                    GENERIC_GET_WELLS_ERROR_MESSAGE(action.payload.barcode);
                dispatch(batchActions([
                    action,
                    removeRequestFromInProgress(AsyncRequest.GET_PLATE),
                    setAlert({
                        message,
                        type: AlertType.ERROR,
                    }),
                ]));

                done();
            }
        }

    },
    transform: ({action}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        next(batchActions([
            addRequestToInProgress(AsyncRequest.GET_PLATE),
            action,
        ]));
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

const closeTemplateEditorLogic = createLogic({
   transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
       next(batchActions([
           clearTemplateDraft(),
           action,
       ]));
   },
    type: CLOSE_TEMPLATE_EDITOR,
});

export default [
    closeTemplateEditorLogic,
    loadFilesLogic,
    openTemplateEditorLogic,
    openFilesLogic,
    getFilesInFolderLogic,
    selectBarcodeLogic,
    selectWorkflowPathLogic,
];
