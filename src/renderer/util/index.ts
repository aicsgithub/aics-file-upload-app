import { AicsGridCell } from "@aics/aics-react-labkey";
import { promises } from "fs";
import {
    forOwn,
    isFunction,
} from "lodash";
import { DragAndDropFileList } from "../state/selection/types";

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
