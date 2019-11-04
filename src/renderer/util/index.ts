import { AicsGridCell } from "@aics/aics-react-labkey";
import { constants, promises } from "fs";
import {
    forOwn,
    isFunction,
    startCase,
} from "lodash";
import { DragAndDropFileList } from "../state/selection/types";
import { TemplateAnnotation } from "../state/template/types";

export function bindAll<T>(obj: T, methods: Array<() => any>) {
    const setOfMethods = new Set(methods);
    forOwn(obj.constructor.prototype, (value, key) => {
        if (setOfMethods.has(value) && isFunction(value)) {
            Object.assign(obj, { [key]: value.bind(obj) });
        }
    });
}

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
            value = false;
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
