import { constants, promises, readdir as fsReaddir, stat as fsStat } from "fs";
import { resolve } from "path";
import { promisify } from "util";

import { memoize, omit, difference, trim, uniq, flatten } from "lodash";

import { LIST_DELIMITER_SPLIT, MAIN_FONT_WIDTH } from "../constants";
import MMSClient from "../services/mms-client";
import { Template, TemplateAnnotation } from "../services/mms-client/types";
import { getWithRetry } from "../state/feedback/util";
import {
  ReduxLogicNextCb,
  ReduxLogicTransformDependencies,
  UploadStateBranch,
} from "../state/types";

const stat = promisify(fsStat);
const readdir = promisify(fsReaddir);

// every annotation will be stored in an array, regardless of whether it can have multiple values or not
export const pivotAnnotations = (
  annotations: TemplateAnnotation[],
  booleanAnnotationTypeId: number
) => {
  return annotations.reduce(
    (accum: any, a: TemplateAnnotation) => ({
      ...accum,
      // Default to `false` for boolean values
      [a.name]: a.annotationTypeId === booleanAnnotationTypeId ? [false] : [],
    }),
    {}
  );
};

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

export interface ApplyTemplateInfo {
  template: Template;
  uploads: UploadStateBranch;
}
/***
 * Helper that gets the template by id from MMS and returns template and updated uploads
 * @param {number} templateId
 * @param {MMSClient} mmsClient
 * @param {ReduxLogicNextCb} dispatch
 * @param {number} booleanAnnotationTypeId boolean annotation type id
 * @param {object | undefined} upload to apply template annotations to
 * @param {Template | undefined} prevAppliedTemplate previously applied template this is to retain
 * any information they may have entered for an upload for an annotation that exists on the new template
 * @returns {Promise<ApplyTemplateInfo>} info needed for setting applied template
 */
export const getApplyTemplateInfo = async (
  templateId: number,
  mmsClient: MMSClient,
  dispatch: ReduxLogicNextCb,
  booleanAnnotationTypeId: number,
  upload?: UploadStateBranch,
  prevAppliedTemplate?: Template
): Promise<ApplyTemplateInfo> => {
  const previousTemplateAnnotationNames = prevAppliedTemplate
    ? prevAppliedTemplate.annotations.map((a) => a.name)
    : [];

  const template: Template = await getWithRetry(
    () => mmsClient.getTemplate(templateId),
    dispatch
  );
  const { annotations } = template;
  const annotationsToExclude = difference(
    previousTemplateAnnotationNames,
    annotations.map((a) => a.name)
  );
  const additionalAnnotations = pivotAnnotations(
    annotations,
    booleanAnnotationTypeId
  );
  const uploads = Object.entries(upload || {}).reduce(
    (accum, [key, metadata]) => ({
      ...accum,
      [key]: {
        ...additionalAnnotations,
        ...omit(metadata, annotationsToExclude),
      },
    }),
    {} as UploadStateBranch
  );
  return { template, uploads };
};

export const CANCEL_BUTTON_INDEX = 0;
export const DISCARD_BUTTON_INDEX = 1;
export const SAVE_UPLOAD_DRAFT_BUTTON_INDEX = 2;
/**
 * Helper function for logics that need to ensure that user has a chance
 * to save their upload before the upload potentially gets updated.
 * Examples include: close upload tab, editing an upload, opening an upload, saving an upload.
 * @param deps redux logic transform dependencies
 * @param canSaveUploadDraft whether the upload draft can be saved
 * @param currentUploadFilePath current file path that the current upload is saved to, if present
 * @param skipWarningDialog whether or not to warn users that if they don't save, their draft will be discarded.
 * This won't be necessary if the user explicitly saves the draft (i.e. File > Save)
 * Returns promise of object { cancelled: boolean, filePath?: string } where cancelled indicates whether
 * to continue with this action (if cancelled is true - logics should reject) and filePath represents
 * the file that user chose to save their draft to - this will be undefined if the user cancels saving.
 */
export const ensureDraftGetsSaved = async (
  deps: ReduxLogicTransformDependencies,
  canSaveUploadDraft: boolean,
  currentUploadFilePath: string | undefined,
  skipWarningDialog = false
): Promise<{
  cancelled: boolean; // User decides they want to continue working on the current upload draft
  filePath?: string; // Where user saved the upload draft
}> => {
  const { dialog, getState, writeFile } = deps;

  // if currentUploadFilePath is set, user is working on a upload draft that
  // they have saved before. Now we just need to save to that file.
  if (currentUploadFilePath) {
    await writeFile(currentUploadFilePath, JSON.stringify(getState()));
    return { cancelled: false, filePath: currentUploadFilePath };
  } else if (canSaveUploadDraft) {
    // figure out if user wants to save their draft before we replace it
    let buttonIndex = SAVE_UPLOAD_DRAFT_BUTTON_INDEX;
    if (!skipWarningDialog) {
      const { response } = await dialog.showMessageBox({
        buttons: ["Cancel", "Discard", "Save Upload Draft"],
        cancelId: CANCEL_BUTTON_INDEX,
        defaultId: SAVE_UPLOAD_DRAFT_BUTTON_INDEX,
        message: "Your draft will be discarded unless you save it.",
        title: "Warning",
        type: "question",
      });
      buttonIndex = response;
    }

    if (buttonIndex === DISCARD_BUTTON_INDEX) {
      // Discard Draft but continue doing what it was we were doing
      return {
        cancelled: false,
        filePath: undefined,
      };
    } else if (buttonIndex === SAVE_UPLOAD_DRAFT_BUTTON_INDEX) {
      try {
        // Save Upload Draft
        const { filePath } = await dialog.showSaveDialog({
          title: "Save Upload Draft",
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (filePath) {
          await writeFile(filePath, JSON.stringify(getState()));
        }

        return {
          cancelled: false,
          filePath,
        };
      } catch (e) {
        throw new Error(`Could not save draft: ${e.message}`);
      }
    } else {
      return {
        cancelled: true,
        filePath: undefined,
      };
    }
  }
  return {
    cancelled: false,
    filePath: undefined,
  };
};

// Returns true if the user has read access to the file path given
const canUserRead = async (filePath: string): Promise<boolean> => {
  try {
    await promises.access(filePath, constants.R_OK);
    return true;
  } catch (permissionError) {
    return false;
  }
};

// For each file path determines if the path leads to a directory
// if so it extracts the file paths for the files within said directory
// otherwise just returns the file path as is.
export async function determineFilesFromNestedPaths(
  paths: string[]
): Promise<string[]> {
  const filePaths = await Promise.all(
    paths.flatMap(async (fullPath) => {
      const stats = await stat(fullPath);
      if (!stats.isDirectory()) {
        return [fullPath];
      }
      const canRead = await canUserRead(fullPath);
      if (!canRead) {
        throw new Error(`User does not have permission to read ${fullPath}`);
      }
      const pathsUnderFolder = await readdir(fullPath, { withFileTypes: true });
      return pathsUnderFolder
        .filter((f) => f.isFile())
        .map((f) => resolve(fullPath, f.name));
    })
  );

  return uniq(flatten(filePaths));
}

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
