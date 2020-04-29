import { makeConstant } from "../util";

const BRANCH_NAME = "jobs";

export const RECEIVE_JOBS = makeConstant(BRANCH_NAME, "receive-jobs");
export const GATHER_STORED_INCOMPLETE_JOB_NAMES = makeConstant(BRANCH_NAME, "gather-stored-incomplete-jobs");
export const UPDATE_INCOMPLETE_JOB_NAMES = makeConstant(BRANCH_NAME, "update-incomplete-jobs");
export const RETRIEVE_JOBS = makeConstant(BRANCH_NAME, "retrieve-jobs");
export const ADD_PENDING_JOB = makeConstant(BRANCH_NAME, "add-pending-job");
export const REMOVE_PENDING_JOB = makeConstant(BRANCH_NAME, "remove-pending-job");
export const SELECT_JOB_FILTER = makeConstant(BRANCH_NAME, "select-job-filter");
export const START_JOB_POLL = makeConstant(BRANCH_NAME, "start-job-poll");
export const STOP_JOB_POLL = makeConstant(BRANCH_NAME, "stop-job-poll");

export const SUCCESSFUL_STATUS = "SUCCEEDED";
export const FAILED_STATUSES = ["FAILED", "UNRECOVERABLE"];
export const IN_PROGRESS_STATUSES = ["BLOCKED", "RETRYING", "WAITING", "WORKING"];
