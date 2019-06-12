import { makeConstant } from "../util";

const BRANCH_NAME = "jobs";

export const SET_UPLOAD_STATUS = makeConstant(BRANCH_NAME, "set-upload-status");
export const SET_JOBS = makeConstant(BRANCH_NAME, "set-jobs");
export const ADD_JOB = makeConstant(BRANCH_NAME, "add-job");
export const SET_CURRENT_JOB_NAME = makeConstant(BRANCH_NAME, "set-current-job-name");
