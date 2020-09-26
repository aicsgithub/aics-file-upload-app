import { makeConstant } from "../util";

const BRANCH_NAME = "jobs";

export const RECEIVE_JOBS = makeConstant(BRANCH_NAME, "receive-jobs");
export const RECEIVE_JOB_INSERT = makeConstant(
  BRANCH_NAME,
  "receive-job-insert"
);
export const RECEIVE_JOB_UPDATE = makeConstant(
  BRANCH_NAME,
  "receive-job-update"
);
export const HANDLE_ABANDONED_JOBS = makeConstant(
  BRANCH_NAME,
  "handle-abandoned-jobs"
);
export const GATHER_STORED_INCOMPLETE_JOB_IDS = makeConstant(
  BRANCH_NAME,
  "gather-stored-incomplete-jobs"
);
export const UPDATE_INCOMPLETE_JOB_IDS = makeConstant(
  BRANCH_NAME,
  "update-incomplete-jobs"
);
export const SELECT_JOB_FILTER = makeConstant(BRANCH_NAME, "select-job-filter");
