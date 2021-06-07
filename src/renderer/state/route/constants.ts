import { makeConstant } from "../util";

const BRANCH_NAME = "route";

export const CLOSE_UPLOAD = makeConstant(BRANCH_NAME, "close-upload");
export const OPEN_JOB_AS_UPLOAD = makeConstant(
  BRANCH_NAME,
  "open-job-as-upload"
);
export const OPEN_JOB_AS_UPLOAD_SUCCEEDED = makeConstant(
  BRANCH_NAME,
  "open-job-as-upload-succeeded"
);
export const RESET_UPLOAD = makeConstant(BRANCH_NAME, "reset-upload");
export const SELECT_PAGE = makeConstant(BRANCH_NAME, "select-page");
export const SELECT_VIEW = makeConstant(BRANCH_NAME, "select-view");
export const START_NEW_UPLOAD = makeConstant(BRANCH_NAME, "start-new-upload");
