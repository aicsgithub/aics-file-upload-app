import { constants, promises } from "fs";

import { AicsGridCell } from "@aics/aics-react-labkey";
import { memoize, castArray, isNil, trim, uniq } from "lodash";

import { LIST_DELIMITER_SPLIT, MAIN_FONT_WIDTH } from "../constants";

/*
 * This file contains pure utility methods with no dependencies on other code
 * in this repo.
 */

export function makePosixPathCompatibleWithPlatform(
  path: string,
  platform: string
): string {
  let updatedPath = path;
  // Replace forward-slashes with back-slashes on Windows
  if (platform === "win32") {
    updatedPath = path.replace(/\//g, "\\");
    if (updatedPath.startsWith("\\allen")) {
      updatedPath = `\\${updatedPath}`;
    }
  }
  return updatedPath;
}

const MAX_ROWS = 26;
/***
 * Returns a human readable label representing the row and column of a well on a plate.
 * Assumes plate does not have more than 26 rows.
 * @param well
 * @param noneText
 */
export function getWellLabel(well?: AicsGridCell, noneText = "None"): string {
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

  const row = String.fromCharCode(97 + (well.row % 26)).toUpperCase();
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

/**
 * Works like lodash's castArray except that if value is undefined, it returns
 * an empty array
 * @param value value to convert to an array
 */
export const convertToArray = (value?: any): any[] =>
  !isNil(value) && value !== "" ? castArray(value) : [];

/**
 * Splits a string on the list delimiter, trims beginning and trailing whitespace, and filters
 * out falsy values
 * @param {string} value
 * @returns {any[]}
 */
export const splitTrimAndFilter = (value = ""): any[] =>
  value
    .split(LIST_DELIMITER_SPLIT)
    .map(trim)
    .filter((v) => !!v);

export const mergeChildPaths = (filePaths: string[]): string[] => {
  filePaths = uniq(filePaths);

  return filePaths.filter((filePath) => {
    const otherFilePaths = filePaths.filter(
      (otherFilePath) => otherFilePath !== filePath
    );
    return !otherFilePaths.find((otherFilePath) =>
      filePath.startsWith(otherFilePath)
    );
  });
};

/**
 * Returns largest factor of 1000 for num
 * @param num
 */
export const getPowerOf1000 = (num: number) => {
  let count = 0;
  while (Math.floor(num / 1000) > 0) {
    count++;
    num = num / 1000;
  }
  return count;
};

const getCanvasContext = memoize(() => {
  return window.document.createElement("canvas").getContext("2d");
});

/**
 * Helper for measuring how wide text would be displayed on the page. Defaults to an approximation of the width
 * if it cannot create a canvas context for some reason.
 * @param font https://developer.mozilla.org/en-US/docs/Web/CSS/font
 * @param text the text to be displayed
 */
export const getTextWidth = (font: string, text: string) => {
  const canvasContext = getCanvasContext();
  if (!canvasContext) {
    return text.length * MAIN_FONT_WIDTH;
  }
  canvasContext.font = font;
  return canvasContext.measureText(text).width;
};

// need a promise based timeout
export const timeout = (ms: number) =>
  new Promise((resolve: () => void) => {
    setTimeout(resolve, ms);
  });
