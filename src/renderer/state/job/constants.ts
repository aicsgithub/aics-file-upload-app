import { makeConstant } from "../util";

const BRANCH_NAME = "jobs";

export const RECEIVE_JOBS = makeConstant(BRANCH_NAME, "receive-jobs");
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
export const RETRIEVE_JOBS = makeConstant(BRANCH_NAME, "retrieve-jobs");
export const RETRIEVE_JOBS_FAILED = makeConstant(
  BRANCH_NAME,
  "retrieve-jobs-failed"
);
export const SELECT_JOB_FILTER = makeConstant(BRANCH_NAME, "select-job-filter");
export const START_JOB_POLL = makeConstant(BRANCH_NAME, "start-job-poll");
export const STOP_JOB_POLL = makeConstant(BRANCH_NAME, "stop-job-poll");
