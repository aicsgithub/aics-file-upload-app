import { makeConstant } from "../util";

const BRANCH_NAME = "jobs";

export const SET_UPLOAD_JOBS = makeConstant(BRANCH_NAME, "set-upload-jobs");
export const SET_COPY_JOBS = makeConstant(BRANCH_NAME, "set-copy-jobs");
export const SET_ADD_METADATA_JOBS = makeConstant(BRANCH_NAME, "set-add-metadata-jobs");
export const RETRIEVE_JOBS = makeConstant(BRANCH_NAME, "retrieve-jobs");
export const ADD_PENDING_JOB = makeConstant(BRANCH_NAME, "add-pending-job");
export const REMOVE_PENDING_JOB = makeConstant(BRANCH_NAME, "remove-pending-job");
