import {
  constants,
  promises,
  readdir as fsReaddir,
  stat as fsStat,
  Stats,
} from "fs";
import { basename, dirname, resolve as resolvePath } from "path";
import { promisify } from "util";

import { AicsGridCell } from "@aics/aics-react-labkey";
import { FileManagementSystem } from "@aics/aicsfiles";
import {
  FileMetadata,
  FileToFileMetadata,
  ImageModelMetadata,
} from "@aics/aicsfiles/type-declarations/types";
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

import { LIST_DELIMITER_SPLIT } from "../constants";
import MMSClient from "../services/mms-client";
import {
  GetPlateResponse,
  PlateResponse,
  Template,
  TemplateAnnotation,
  WellResponse,
} from "../services/mms-client/types";
import { getWithRetry } from "../state/feedback/util";
import { DragAndDropFileList } from "../state/types";
import {
  ImagingSessionIdToPlateMap,
  ImagingSessionIdToWellsMap,
  ReduxLogicNextCb,
  ReduxLogicTransformDependencies,
  UploadFile,
  UploadMetadata,
  UploadStateBranch,
} from "../state/types";

const stat = promisify(fsStat);
const readdir = promisify(fsReaddir);

export async function readTxtFile(
  file: string,
  handleError: (error: string) => void
): Promise<string> {
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

export async function onDrop(
  files: DragAndDropFileList,
  handleError: (error: string) => void
): Promise<string> {
  if (files.length > 1) {
    throw new Error(`Unexpected number of files dropped: ${files.length}.`);
  }
  if (files.length < 1) {
    return "";
  }
  return await readTxtFile(files[0].path, handleError);
}

export async function onOpen(
  files: string[],
  handleError: (error: string) => void
): Promise<string> {
  if (files.length > 1) {
    throw new Error(`Unexpected number of files opened: ${files.length}.`);
  }
  if (files.length < 1) {
    return "";
  }
  return await readTxtFile(files[0], handleError);
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

export interface PlateInfo {
  plate: ImagingSessionIdToPlateMap;
  wells: ImagingSessionIdToWellsMap;
}
/**
 * Queries for plate with given barcode and transforms the response into a list of actions to dispatch
 * @param {string} barcode
 * @param {number[]} imagingSessionIds the imagingSessionIds for the plate with this barcode
 * @param {MMSClient} mmsClient
 * @param {ReduxLogicNextCb} dispatch
 * @returns {Promise<PlateInfo>}
 */
export const getPlateInfo = async (
  barcode: string,
  imagingSessionIds: Array<number | null>,
  mmsClient: MMSClient,
  dispatch: ReduxLogicNextCb
): Promise<PlateInfo> => {
  const request = (): Promise<GetPlateResponse[]> =>
    Promise.all(
      imagingSessionIds.map((imagingSessionId: number | null) =>
        mmsClient.getPlate(barcode, imagingSessionId || undefined)
      )
    );

  const platesAndWells: GetPlateResponse[] = await getWithRetry(
    request,
    dispatch
  );

  const imagingSessionIdToPlate: {
    [imagingSessionId: number]: PlateResponse;
  } = {};
  const imagingSessionIdToWells: {
    [imagingSessionId: number]: WellResponse[];
  } = {};
  imagingSessionIds.forEach((imagingSessionId: number | null, i: number) => {
    imagingSessionId = !imagingSessionId ? 0 : imagingSessionId;
    const { plate, wells } = platesAndWells[i];
    imagingSessionIdToPlate[imagingSessionId] = plate;
    imagingSessionIdToWells[imagingSessionId] = wells;
  });

  return {
    plate: imagingSessionIdToPlate,
    wells: imagingSessionIdToWells,
  };
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
  transformDates = true
): Promise<ImageModelMetadata[]> => {
  const resolvedPromises: FileMetadata[] = await Promise.all(
    fileIds.map((fileId: string) => fms.getCustomMetadataForFile(fileId))
  );
  const fileMetadataForFileIds = reduce(
    resolvedPromises,
    (filesToFileMetadata: FileToFileMetadata, fileMetadata: FileMetadata) => ({
      ...filesToFileMetadata,
      [fileMetadata.fileId]: fileMetadata,
    }),
    {}
  );
  return await fms.transformFileMetadataIntoTable(
    fileMetadataForFileIds,
    transformDates
  );
};

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
  const uploads: UploadStateBranch = {};
  forEach(upload, (metadata: UploadMetadata, key: string) => {
    annotationsToExclude.forEach(
      (annotation: string) => delete metadata[annotation]
    );
    uploads[key] = {
      ...additionalAnnotations,
      ...metadata, // prevent existing annotations from getting overwritten
    };
  });
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

export class UploadFileImpl implements UploadFile {
  public name: string;
  public path: string;
  // this will get populated once the folder is expanded
  public files: UploadFile[] = [];
  public readonly isDirectory: boolean;
  public readonly canRead: boolean;

  constructor(
    name: string,
    path: string,
    isDirectory: boolean,
    canRead: boolean
  ) {
    this.name = name;
    this.path = path;
    this.isDirectory = isDirectory;
    this.canRead = canRead;
  }

  get fullPath(): string {
    return resolvePath(this.path, this.name);
  }

  public async loadFiles(): Promise<Array<Promise<UploadFile>>> {
    if (!this.isDirectory) {
      return Promise.reject("Not a directory");
    }
    const fullPath = resolvePath(this.path, this.name);
    if (!this.canRead) {
      return Promise.reject(
        `You do not have permission to view this file/directory: ${fullPath}.`
      );
    }

    const files: string[] = await readdir(this.fullPath);
    return files.map(async (file: string) => {
      const filePath = resolvePath(this.fullPath, file);
      const stats: Stats = await stat(filePath);
      const canRead = await canUserRead(filePath);
      return new UploadFileImpl(
        basename(filePath),
        dirname(filePath),
        stats.isDirectory(),
        canRead
      );
    });
  }
}

export const getUploadFilePromise = async (
  name: string,
  path: string
): Promise<UploadFile> => {
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
