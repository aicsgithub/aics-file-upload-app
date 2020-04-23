import { AicsGridCell } from "@aics/aics-react-labkey";
import { FileManagementSystem } from "@aics/aicsfiles";
import { FileMetadata, FileToFileMetadata, ImageModelMetadata } from "@aics/aicsfiles/type-declarations/types";
import { constants, promises, stat as fsStat, Stats } from "fs";
import * as Store from "electron-store";

import {
    castArray,
    difference,
    forEach,
    isNil,
    reduce,
    startCase,
    trim,
    uniq,
} from "lodash";
import { resolve as resolvePath } from "path";
import { AnyAction } from "redux";
import { promisify } from "util";

import { LIST_DELIMITER_SPLIT } from "../constants";
import { API_WAIT_TIME_SECONDS } from "../state/constants";
import {
    addRequestToInProgress,
    removeRequestFromInProgress,
    setAlert,
    setSuccessAlert,
} from "../state/feedback/actions";
import { AlertType, AsyncRequest } from "../state/feedback/types";
import { getBooleanAnnotationTypeId } from "../state/metadata/selectors";
import { setPlate } from "../state/selection/actions";
import { GENERIC_GET_WELLS_ERROR_MESSAGE } from "../state/selection/logics";
import { UploadFileImpl } from "../state/selection/models/upload-file";
import {
    DragAndDropFileList,
    GetPlateResponse,
    PlateResponse,
    SetPlateAction,
    UploadFile,
    WellResponse,
} from "../state/selection/types";
import { setAppliedTemplate } from "../state/template/actions";
import { getAppliedTemplate } from "../state/template/selectors";
import { SetAppliedTemplateAction, Template, TemplateAnnotation } from "../state/template/types";
import { HTTP_STATUS, ReduxLogicNextCb, State } from "../state/types";
import { getUpload } from "../state/upload/selectors";
import { UploadMetadata, UploadStateBranch } from "../state/upload/types";
import { batchActions } from "../state/util";

import MMSClient from "./mms-client";

const stat = promisify(fsStat);

export async function onDrop(files: DragAndDropFileList, handleError: (error: string) => void): Promise<string> {
    if (files.length > 1) {
        throw new Error(`Unexpected number of files dropped: ${files.length}.`);
    }
    if (files.length < 1) {
        return "";
    }
    return await readTxtFile(files[0].path, handleError);
}

export async function onOpen(files: string[], handleError: (error: string) => void): Promise<string> {
    if (files.length > 1) {
        throw new Error(`Unexpected number of files opened: ${files.length}.`);
    }
    if (files.length < 1) {
        return "";
    }
    return await readTxtFile(files[0], handleError);
}

export async function readTxtFile(file: string, handleError: (error: string) => void): Promise<string> {
    try {
        const notesBuffer = await promises.readFile(file);
        const notes = notesBuffer.toString();
        if (!notes) {
            handleError("No notes found in file.");
        }
        return notes;
    } catch (e) {
        // It is possible for a user to select a directory
        handleError("Invalid file or directory selected (.txt only)");
        return "";
    }
}

const MAX_ROWS = 26;

/***
 * Returns a human readable label representing the row and column of a well on a plate.
 * Assumes plate does not have more than 26 rows.
 * @param well
 * @param noneText
 */
export function getWellLabel(well?: AicsGridCell, noneText: string = "None"): string {
    if (!well) {
        return noneText;
    }

    if (well.row < 0 || well.col < 0) {
        throw Error("Well row and col cannot be negative!");
    }

    // row and col are zero-based indexes
    if (well.row > MAX_ROWS - 1) {
        throw Error(`Well row cannot exceed ${MAX_ROWS}`);
    }

    const row = String.fromCharCode(97 +  (well.row % 26)).toUpperCase();
    const col = well.col + 1;
    return `${row}${col}`;
}

/***
 * Returns number representing sort order of first string param compared to second string param
 * If a is alphabetically before b, returns 1.
 * If a is equal to b, returns 0.
 * If a is alphabetically after b, returns -1.
 * @param a string
 * @param b string
 */
export const alphaOrderComparator = (a: string, b: string): number => {
    if (a < b) {
        return 1;
    } else if (a === b) {
        return 0;
    }

    return -1;
};

export const canUserRead = async (filePath: string): Promise<boolean> => {
    try {
        await promises.access(filePath, constants.R_OK);
        return true;
    } catch (permissionError) {
        return false;
    }
};

export const pivotAnnotations = (annotations: TemplateAnnotation[], booleanAnnotationTypeId: number) => {
    return annotations.reduce((accum: any, a: TemplateAnnotation) => {
        let value;
        if (a.annotationTypeId === booleanAnnotationTypeId) {
            if (a.canHaveManyValues) {
                value = [false];
            } else {
                value = false;
            }
        } else if (a.canHaveManyValues) {
            value = [];
        }
        return {
            ...accum,
            [a.name]: value,
        };
    }, {});
};

// start case almost works but adds spaces before numbers which we'll remove here
export const titleCase = (name?: string) => {
    const result = startCase(name);
    return result.replace(/\s([0-9]+)/g, "$1");
};

/**
 * Works like lodash's castArray except that if value is undefined, it returns
 * an empty array
 * @param value value to convert to an array
 */
export const convertToArray = (value?: any): any[] => !isNil(value) ? castArray(value) : [];

/**
 * Splits a string on the list delimiter, trims beginning and trailing whitespace, and filters
 * out falsy values
 * @param {string} value
 * @returns {any[]}
 */
export const splitTrimAndFilter = (value: string = ""): any[] =>
    value.split(LIST_DELIMITER_SPLIT).map(trim).filter((v) => !!v);

export function makePosixPathCompatibleWithPlatform(
    path: string,
    platform: string
): string {
    if (platform === "win32") {
        path = path.replace(/\//g, "\\");
        if (path.startsWith("\\allen")) {
            path = `\\${path}`;
        }
    }
    return path;
}

export const SERVICE_IS_DOWN_MESSAGE = (service: string) =>
    `Could not contact server. Make sure ${service} is running.`;
export const SERVICE_MIGHT_BE_DOWN_MESSAGE = (service: string) => `${service} might be down. Retrying request...`;
const CANNOT_FIND_ADDRESS = "ENOTFOUND";

/**
 * Returns the result of a request and retries for 2 minutes while the response is a Gateway Error
 * @param request callback that returns a promise that we may want to retry
 * @param requestType the name of the request
 * @param dispatch callback from redux logic process
 * @param serviceName name of the service we're contacting
 * @param genericError error to show in case this we do not get a bad gateway and the error message is not defined
 * @param batchActionsFn only necessary for testing
 */
export function getWithRetry<T = any>(
    request: () => Promise<T>,
    requestType: AsyncRequest,
    dispatch: ReduxLogicNextCb,
    serviceName: string,
    genericError?: string,
    batchActionsFn: (actions: AnyAction[]) => AnyAction = batchActions
): Promise<T> {

    return new Promise(async (resolve, reject) => {
        dispatch(addRequestToInProgress(requestType));
        const startTime = (new Date()).getTime() / 1000;
        let currentTime = startTime;
        let response: T | undefined;
        let receivedRetryableError = false;
        let sentRetryAlert = false;
        let error;

        while ((currentTime - startTime < API_WAIT_TIME_SECONDS) && !response
        && !receivedRetryableError) {
            try {
                response = await request();

            } catch (e) {
                // Retry if we get a Bad Gateway. This is common when a server goes down during deployment.
                if (e.response?.status === HTTP_STATUS.BAD_GATEWAY) {
                    if (!sentRetryAlert) {
                        dispatch(setAlert({
                            manualClear: true,
                            message: SERVICE_MIGHT_BE_DOWN_MESSAGE(serviceName),
                            type: AlertType.WARN,
                        }));
                        sentRetryAlert = true;
                    }
                // Retrying requests where the host could not be resolved. This is common for VPN issues.
                } else if (e.code === CANNOT_FIND_ADDRESS) {
                    if (!sentRetryAlert) {
                        dispatch(setAlert({
                            manualClear: true,
                            message: "Could not reach host. Retrying request...",
                            type: AlertType.WARN,
                        }));
                    }
                    sentRetryAlert = true;
                } else {
                    receivedRetryableError = true;
                    error = e.message;
                }
            } finally {
                currentTime = (new Date()).getTime() / 1000;
            }
        }

        if (response) {
            if (sentRetryAlert) {
                dispatch(setSuccessAlert("Success!"));
            }
            dispatch(removeRequestFromInProgress(requestType));
            resolve(response);
        } else {
            let message = genericError;
            if (sentRetryAlert) {
                message = SERVICE_IS_DOWN_MESSAGE(serviceName);
            } else if (error) {
                message = error;
            }
            dispatch(batchActionsFn([
                removeRequestFromInProgress(requestType),
                setAlert({
                    message,
                    type: AlertType.ERROR,
                }),
            ]));
            reject(new Error(message));
        }
    });
}

export const getUploadFilePromise = async (name: string, path: string): Promise<UploadFile> => {
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

export const mergeChildPaths = (filePaths: string[]): string[] => {
    filePaths = uniq(filePaths);

    return filePaths.filter((filePath) => {
        const otherFilePaths = filePaths.filter((otherFilePath) => otherFilePath !== filePath);
        return !otherFilePaths.find((otherFilePath) => filePath.indexOf(otherFilePath) === 0);
    });
};

/**
 * Queries for plate with given barcode and transforms the response into a list of actions to dispatch
 * @param {string} barcode
 * @param {number[]} imagingSessionIds the imagingSessionIds for the plate with this barcode
 * @param {MMSClient} mmsClient
 * @param {ReduxLogicNextCb} dispatch
 * @returns {Promise<AnyAction[]>}
 */
export const getSetPlateAction = async (
    barcode: string,
    imagingSessionIds: Array<number | null>,
    mmsClient: MMSClient,
    dispatch: ReduxLogicNextCb
): Promise<SetPlateAction> => {
    const request = (): Promise<GetPlateResponse[]> => Promise.all(
        imagingSessionIds.map((imagingSessionId: number | null) =>
            mmsClient.getPlate(barcode, imagingSessionId || undefined))
    );

    const platesAndWells: GetPlateResponse[] = await getWithRetry(
        request,
        AsyncRequest.GET_PLATE,
        dispatch,
        "MMS",
        GENERIC_GET_WELLS_ERROR_MESSAGE(barcode)
    );

    const imagingSessionIdToPlate: {[imagingSessionId: number]: PlateResponse} = {};
    const imagingSessionIdToWells: {[imagingSessionId: number]: WellResponse[]} = {};
    imagingSessionIds.forEach((imagingSessionId: number | null, i: number) => {
        imagingSessionId = !imagingSessionId ? 0 : imagingSessionId;
        const { plate, wells } = platesAndWells[i];
        imagingSessionIdToPlate[imagingSessionId] = plate;
        imagingSessionIdToWells[imagingSessionId] = wells;
    });

    return setPlate(imagingSessionIdToPlate, imagingSessionIdToWells, imagingSessionIds);
};

/**
 * Helper for logics that need to retrieve file metadata
 * @param {string[]} fileIds
 * @param {FileManagementSystem} fms
 * @param {boolean} transformDates whether to convert annotation values for date annotations to dates or
 * leave them as strings
 * @returns {AnyAction} actions to dispatch
 */
export const retrieveFileMetadata = async (
    fileIds: string[],
    fms: FileManagementSystem,
    transformDates: boolean = true
): Promise<ImageModelMetadata[]> => {
    // todo remove hack
    // const storage = new Store();
    // if (storage.has("fileMetadata")) {
    //     return Promise.resolve(storage.get("fileMetadata") as ImageModelMetadata[]);
    // }
    fileIds = ["345da69bbd1348799bbaaa4139cbd96c"];
    const resolvedPromises: FileMetadata[] = await Promise.all(
        fileIds.map((fileId: string) => fms.getCustomMetadataForFile(fileId))
    );
    const fileMetadataForFileIds = reduce(
        resolvedPromises,
        (filesToFileMetadata: FileToFileMetadata, fileMetadata: FileMetadata) => ({
            ...filesToFileMetadata,
            [fileMetadata.fileId]: fileMetadata,
        }), {});
    const result = await fms.transformFileMetadataIntoTable(fileMetadataForFileIds, transformDates);
    // storage.set("fileMetadata", result);
    return result;
};

/***
 * Helper that gets the template by id from MMS and returns setappliedtemplate action
 * and update the uploads with those annotations
 * @param {number} templateId
 * @param {() => State} getState
 * @param {MMSClient} mmsClient
 * @param {ReduxLogicNextCb} dispatch
 * @returns {Promise<SetAppliedTemplateAction>}
 */
export const getSetAppliedTemplateAction = async (
    templateId: number,
    getState: () => State,
    mmsClient: MMSClient,
    dispatch: ReduxLogicNextCb
): Promise<SetAppliedTemplateAction> => {
    const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
    if (!booleanAnnotationTypeId) {
        throw new Error("Could not get boolean annotation type. Contact Software");
    }
    const prevAppliedTemplate = getAppliedTemplate(getState());
    const previousTemplateAnnotationNames = prevAppliedTemplate ?
        prevAppliedTemplate.annotations.map((a) => a.name) : [];

    const template: Template = await getWithRetry(
        () => mmsClient.getTemplate(templateId),
        AsyncRequest.GET_TEMPLATE,
        dispatch,
        "MMS",
        "Could not retrieve template"
    );
    const { annotations } = template;
    const annotationsToExclude = difference(previousTemplateAnnotationNames, annotations.map((a) => a.name));
    const additionalAnnotations = pivotAnnotations(annotations, booleanAnnotationTypeId);
    const uploads: UploadStateBranch = {};
    forEach(getUpload(getState()), (metadata: UploadMetadata, key: string) => {
        annotationsToExclude.forEach((annotation: string) => delete metadata[annotation]);
        uploads[key] = {
           ...additionalAnnotations,
           ...metadata, // prevent existing annotations from getting overwritten
        };
    });
    return setAppliedTemplate(template, uploads);
};
