import { AicsGridCell } from "@aics/aics-react-labkey";
import { constants, promises } from "fs";
import {
    castArray,
    isNil,
    startCase,
    trim,
} from "lodash";
import { AnyAction } from "redux";
import { LIST_DELIMITER_SPLIT } from "../constants";
import { API_WAIT_TIME_SECONDS } from "../state/constants";
import { addRequestToInProgress, clearAlert, removeRequestFromInProgress, setAlert } from "../state/feedback/actions";
import { AlertType, AsyncRequest } from "../state/feedback/types";
import { DragAndDropFileList } from "../state/selection/types";
import { TemplateAnnotation } from "../state/template/types";
import { HTTP_STATUS } from "../state/types";
import { batchActions } from "../state/util";

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

/**
 * Returns the result of a request and retries for 2 minutes while the response is a Gateway Error
 * @param request
 * @param requestType
 * @param dispatch
 * @param serviceName
 * @param genericError
 * @param batchActionsFn only necessary for testing
 */
export function getWithRetry<T = any>(
    request: () => Promise<T>,
    requestType: AsyncRequest,
    dispatch: (action: AnyAction) => void,
    serviceName: string,
    genericError?: string,
    batchActionsFn: (actions: AnyAction[]) => AnyAction = batchActions
): Promise<T> {

    return new Promise(async (resolve, reject) => {
        dispatch(addRequestToInProgress(requestType));
        const startTime = (new Date()).getTime() / 1000;
        let currentTime = startTime;
        let response: T | undefined;
        let receivedNonGatewayError = false;
        let sentRetryAlert = false;
        let error;

        while ((currentTime - startTime < API_WAIT_TIME_SECONDS) && !response
        && !receivedNonGatewayError) {
            try {
                response = await request();

            } catch (e) {
                if (e.response && e.response.status === HTTP_STATUS.BAD_GATEWAY) {
                    if (!sentRetryAlert) {
                        dispatch(setAlert({
                            manualClear: true,
                            message: SERVICE_MIGHT_BE_DOWN_MESSAGE(serviceName),
                            type: AlertType.WARN,
                        }));
                        sentRetryAlert = true;
                    }
                } else {
                    receivedNonGatewayError = true;
                    error = e.message;
                }
            } finally {
                currentTime = (new Date()).getTime() / 1000;
            }
        }

        if (response) {
            if (sentRetryAlert) {
                dispatch(batchActionsFn([
                    clearAlert(),
                    removeRequestFromInProgress(requestType),
                ]));
            } else {
                dispatch(removeRequestFromInProgress(requestType));
            }
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
