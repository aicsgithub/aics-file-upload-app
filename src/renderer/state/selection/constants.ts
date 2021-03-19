import { makeConstant } from "../util";

const BRANCH_NAME = "selection";

export const CLOSE_SUB_FILE_SELECTION_MODAL = makeConstant(
  BRANCH_NAME,
  "close-sub-file-selection-modal"
);
export const OPEN_SUB_FILE_SELECTION_MODAL = makeConstant(
  BRANCH_NAME,
  "open-sub-file-selection-modal"
);
export const SELECT_BARCODE = makeConstant(BRANCH_NAME, "select-barcode");
export const SET_HAS_NO_PLATE_TO_UPLOAD = makeConstant(
  BRANCH_NAME,
  "set-has-no-plate"
);
export const SET_PLATE = makeConstant(BRANCH_NAME, "set-plate");
export const SELECT_METADATA = makeConstant(BRANCH_NAME, "select-metadata");
export const LOAD_FILES = makeConstant(BRANCH_NAME, "load-files");
export const OPEN_FILES = makeConstant(BRANCH_NAME, "open-files");
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
export const ADD_ROW_TO_DRAG_EVENT = makeConstant(
  BRANCH_NAME,
  "add-row-to-drag-event"
);
export const REMOVE_ROW_FROM_DRAG_EVENT = makeConstant(
  BRANCH_NAME,
  "remove-row-from-drag-event"
);
export const START_CELL_DRAG = makeConstant(BRANCH_NAME, "start-cell-drag");
export const STOP_CELL_DRAG = makeConstant(BRANCH_NAME, "stop-cell-drag");
export const UPDATE_MASS_EDIT_ROW = makeConstant(
  BRANCH_NAME,
  "update-mass-edit-row"
);
export const START_MASS_EDIT = makeConstant(BRANCH_NAME, "start-mass-edit");
export const CANCEL_MASS_EDIT = makeConstant(BRANCH_NAME, "cancel-mass-edit");
export const APPLY_MASS_EDIT = makeConstant(BRANCH_NAME, "apply-mass-edit");
