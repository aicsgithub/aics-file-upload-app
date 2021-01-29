import { makeConstant } from "../util";

const BRANCH_NAME = "selection";

export const SELECT_BARCODE = makeConstant(BRANCH_NAME, "select-barcode");
export const SELECT_WORKFLOWS = makeConstant(BRANCH_NAME, "select-workflows");
export const SET_PLATE = makeConstant(BRANCH_NAME, "set-plate");
export const SELECT_FILE = makeConstant(BRANCH_NAME, "select-file");
export const SELECT_METADATA = makeConstant(BRANCH_NAME, "select-metadata");
export const LOAD_FILES = makeConstant(BRANCH_NAME, "load-files");
export const OPEN_FILES = makeConstant(BRANCH_NAME, "open-files");
export const SELECT_WORKFLOW_PATH = makeConstant(
  BRANCH_NAME,
  "select-workflow-path"
);
export const GET_FILES_IN_FOLDER = makeConstant(
  BRANCH_NAME,
  "get-files-in-folder"
);
export const SELECT_WELLS = makeConstant(BRANCH_NAME, "select-wells");
export const JUMP_TO_PAST_SELECTION = makeConstant(BRANCH_NAME, "jump-to-past");
export const CLEAR_SELECTION_HISTORY = makeConstant(
  BRANCH_NAME,
  "clear-history"
);
export const TOGGLE_EXPANDED_UPLOAD_JOB_ROW = makeConstant(
  BRANCH_NAME,
  "toggle-expanded-upload-job-row"
);
export const SELECT_IMAGING_SESSION_ID = makeConstant(
  BRANCH_NAME,
  "select-imaging-session-id"
);
export const UPDATE_MASS_EDIT_ROW = makeConstant(
  BRANCH_NAME,
  "update-mass-edit-row"
);
