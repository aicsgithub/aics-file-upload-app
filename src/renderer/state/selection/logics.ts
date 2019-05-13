import { stat as fsStat, Stats } from "fs";
import { isEmpty, uniq } from "lodash";
import { basename, dirname, resolve as resolvePath } from "path";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { promisify } from "util";

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
import { updatePageHistory } from "../metadata/actions";
import { getSelectionHistory, getUploadHistory } from "../metadata/selectors";

import {
    HTTP_STATUS,
    ReduxLogicDependencies,
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicTransformDependencies,
    State
} from "../types";
import { clearUploadHistory, jumpToPastUpload } from "../upload/actions";
import { getCurrentUploadIndex } from "../upload/selectors";
import { batchActions, getActionFromBatch } from "../util";

import {
    clearSelectionHistory,
    jumpToPastSelection,
    selectPage,
    setViabilityResults,
    setWells,
    stageFiles,
    updateStagedFiles
} from "./actions";
import {
    GET_FILES_IN_FOLDER,
    GO_BACK,
    GO_FORWARD,
    LOAD_FILES,
    OPEN_FILES,
    SELECT_BARCODE,
    SELECT_PAGE,
} from "./constants";
import { UploadFileImpl } from "./models/upload-file";
import { getCurrentSelectionIndex, getPage, getStagedFiles } from "./selectors";
import {
    DragAndDropFileList,
    GetPlateResponse,
    GetViabilityResultResponse,
    Page,
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
    const stats: Stats = await stat(resolvePath(path, name));
    const isDirectory = stats.isDirectory();
    const file = new UploadFileImpl(name, path, isDirectory);

    if (isDirectory) {
        file.files = await Promise.all(await file.loadFiles());
    }

    return file;
};

const stageFilesAndStopLoading = async (uploadFilePromises: Array<Promise<UploadFile>>, dispatch: ReduxLogicNextCb,
                                        done: ReduxLogicDoneCb) => {
    try {
        const uploadFiles = await Promise.all(uploadFilePromises);
        dispatch(batchActions([
            stopLoading(),
            stageFiles(uploadFiles),
        ]));
        done();

    } catch (e) {
        // tslint:disable-next-line
        console.log(e);

        dispatch(batchActions([
            stopLoading(),
            setAlert({
                message: "Encountered error while resolving files",
                type: AlertType.ERROR,
            }),
        ]));
        done();
    }
};

const openFilesTransformLogic = ({ action, getState }: ReduxLogicDependencies, next: ReduxLogicNextCb) => {
    const actions = [action, startLoading()];
    const page: Page = getPage(getState());
    if (page === Page.DragAndDrop) {
        actions.push(...getGoForwardActions(page, getState()));
    }
    next(batchActions(actions));
};

const loadFilesLogic = createLogic({
    process: async ({ action }: ReduxLogicDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const originalAction = action.payload.filter((a: AnyAction) => a.type === LOAD_FILES);

        if (!isEmpty(originalAction)) {
            const filesToLoad: DragAndDropFileList = originalAction[0].payload;
            const uploadFilePromises: Array<Promise<UploadFile>> = [];
            // map and for-of does not exist on type FileList so we have to use a basic for loop
            // tslint:disable-next-line
            for (let i = 0; i < filesToLoad.length; i++) {
                const fileToLoad = filesToLoad[i];
                uploadFilePromises.push(
                    getUploadFilePromise(fileToLoad.name, dirname(fileToLoad.path))
                );
            }

            await stageFilesAndStopLoading(uploadFilePromises, dispatch, done);
        }
    },
    transform: openFilesTransformLogic,
    type: LOAD_FILES,
});

const openFilesLogic = createLogic({
    process: async ({ action }: ReduxLogicDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const originalAction = action.payload.filter((a: AnyAction) => a.type === OPEN_FILES);

        if (!isEmpty(originalAction)) {
            const filesToLoad: string[] = mergeChildPaths(originalAction[0].payload);

            const uploadFilePromises: Array<Promise<UploadFile>> = filesToLoad.map(
                (filePath: string) => getUploadFilePromise(basename(filePath), dirname(filePath))
            );

            await stageFilesAndStopLoading(uploadFilePromises, dispatch, done);
        }
    },
    transform: openFilesTransformLogic,
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
            // tslint:disable-next-line
           console.log(e);
        }

    },
    type: GET_FILES_IN_FOLDER,
});

async function getPlate({ action, getState, httpClient, baseMmsUrl }: ReduxLogicTransformDependencies,
                        barcode: string): Promise<GetPlateResponse> {
    const response = await httpClient.get(`${baseMmsUrl}/1.0/plate/query?barcode=${barcode}`);
    return response.data.data[0];
}

async function getViabilityResults({action, getState, httpClient, baseMmsUrl}: ReduxLogicTransformDependencies,
                                   plateId: number):
    Promise<GetViabilityResultResponse[]> {
    const response = await httpClient.get(`${baseMmsUrl}/1.0/plate/${plateId}/assay/viabilityResult`);
    return response.data.data;
}

export const GENERIC_GET_WELLS_ERROR_MESSAGE = (barcode: string) => `Could not retrieve wells for barcode ${barcode}`;
export const MMS_IS_DOWN_MESSAGE = "Could not contact server. Make sure MMS is running.";
export const MMS_MIGHT_BE_DOWN_MESSAGE = "Server might be down. Retrying GET wells request...";

const selectBarcodeLogic = createLogic({
    process: async (deps: ReduxLogicDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const action = getActionFromBatch(deps.action, SELECT_BARCODE);

        if (!action) {
            done();
        } else {
            const barcode = action.payload;
            const startTime = (new Date()).getTime() / 1000;
            let currentTime = startTime;
            let receivedSuccessfulResponse = false;
            let receivedNonGatewayError = false;
            let sentRetryAlert = false;

            while ((currentTime - startTime < API_WAIT_TIME_SECONDS) && !receivedSuccessfulResponse
            && !receivedNonGatewayError) {
                try {
                    const { plate, wells } = await getPlate(deps, barcode);
                    const { plateId } = plate;
                    const viabilityResults: GetViabilityResultResponse[] = await getViabilityResults(deps, plateId);
                    receivedSuccessfulResponse = true;
                    const actions = [
                        setWells(wells),
                        removeRequestFromInProgress(AsyncRequest.GET_PLATE),
                        setViabilityResults(viabilityResults),
                        action,
                    ];
                    actions.push(...getGoForwardActions(Page.EnterBarcode, deps.getState()));
                    dispatch(batchActions(actions));
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

const pageOrder: Page[] = [
    Page.DragAndDrop,
    Page.EnterBarcode,
    Page.AssociateWells,
    Page.UploadJobs,
    Page.UploadSummary,
];
const selectPageLogic = createLogic({
    process: ({action, getState}: ReduxLogicDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const { currentPage, nextPage } = action.payload;
        const state = getState();

        const nextPageOrder: number = pageOrder.indexOf(nextPage);
        const currentPageOrder: number = pageOrder.indexOf(currentPage);

        // going back - rewind selections and uploads to the state they were at when user was on previous page
        if (nextPageOrder < currentPageOrder) {
            const selectionIndex = getSelectionHistory(state)[nextPage];
            const uploadIndex = getUploadHistory(state)[nextPage];
            const actions = [];

            if (selectionIndex > -1) {
                actions.push(jumpToPastSelection(selectionIndex));
            }

            if (selectionIndex === 0) {
                actions.push(clearSelectionHistory());
            }

            if (uploadIndex > -1) {
                actions.push(jumpToPastUpload(uploadIndex));
            }

            if (uploadIndex === 0) {
                actions.push(clearUploadHistory());
            }

            if (!isEmpty(actions)) {
                dispatch(batchActions(actions));
            }

        // going forward - store current selection/upload indexes so we can rewind to this state if user goes back
        } else if (nextPageOrder > currentPageOrder) {
            const selectionIndex = getCurrentSelectionIndex(state);
            const uploadIndex = getCurrentUploadIndex(state);
            dispatch(updatePageHistory(getPage(state), selectionIndex, uploadIndex));
        }

        done();
    },
    type: SELECT_PAGE,
});

const goBackLogic = createLogic({
    transform: ({getState, action, dialog}: ReduxLogicTransformDependencies,
                next: ReduxLogicNextCb, reject: () => void) => {
        const state = getState();
        const currentPage = getPage(state);
        const nextPage = getNextPage(currentPage, -1);

        if (nextPage) {
            dialog.showMessageBox({
                buttons: ["Cancel", "Yes"],
                cancelId: 0,
                defaultId: 1,
                message: "Changes will be lost if you go back. Are you sure?",
                title: "Warning",
                type: "warning",
            }, (response: number) => {
                if (response === 1) {
                    next(selectPage(currentPage, nextPage));
                } else {
                   reject();
                }
            });
        } else {
            reject();
        }
    },
    type: GO_BACK,
});

const goForwardLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb, reject: () => void) => {
        const currentPage = getPage(getState());
        const nextPage = getNextPage(currentPage, 1);

        if (nextPage) {
            next(selectPage(currentPage, nextPage));
        } else {
           reject();
        }
    },
    type: GO_FORWARD,
});

/***
 * Helper function for getting a page relative to a given page. Returns null if direction is out of bounds or
 * if current page is not recognized.
 * @param currentPage page to start at
 * @param direction number of steps forward or back (negative) from currentPage
 */
const getNextPage = (currentPage: Page, direction: number): Page | null => {
    const currentPageIndex = pageOrder.indexOf(currentPage);
    if (currentPageIndex > -1) {
        const nextPageIndex = currentPageIndex + direction;

        if (nextPageIndex > -1 && nextPageIndex < pageOrder.length) {
            return pageOrder[nextPageIndex];
        }
    }

    return null;
};

// For batching only. Returns new actions
const getGoForwardActions = (lastPage: Page, state: State): AnyAction[] => {
    const actions = [];

    const currentSelectionIndex = getCurrentSelectionIndex(state);
    const currentUploadIndex = getCurrentUploadIndex(state);
    actions.push(updatePageHistory(lastPage, currentSelectionIndex, currentUploadIndex));

    const nextPage = getNextPage(lastPage, 1);
    if (nextPage) {
        actions.push(selectPage(lastPage, nextPage));
    }

    return actions;
};

export default [
    goBackLogic,
    goForwardLogic,
    loadFilesLogic,
    openFilesLogic,
    getFilesInFolderLogic,
    selectBarcodeLogic,
    selectPageLogic,
];
