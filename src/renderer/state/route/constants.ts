import { makeConstant } from "../util";

const BRANCH_NAME = "route";

export const CLOSE_SETTINGS = makeConstant(BRANCH_NAME, "close-settings");
export const CLOSE_UPLOAD = makeConstant(BRANCH_NAME, "close-upload");
export const OPEN_EDIT_FILE_METADATA_TAB = makeConstant(
  BRANCH_NAME,
  "open-edit-file-metadata-tab"
);
export const OPEN_EDIT_FILE_METADATA_TAB_SUCCEEDED = makeConstant(
  BRANCH_NAME,
  "open-edit-file-metadata-tab-succeeded"
);
export const SELECT_PAGE = makeConstant(BRANCH_NAME, "select-page");
export const SELECT_VIEW = makeConstant(BRANCH_NAME, "select-view");
