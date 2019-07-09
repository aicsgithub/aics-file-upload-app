import { makeConstant } from "../util";

const BRANCH_NAME = "jobs";

export const SET_UPLOAD_JOBS = makeConstant(BRANCH_NAME, "set-upload-jobs");
export const SET_COPY_JOBS = makeConstant(BRANCH_NAME, "set-copy-jobs");
export const RETRIEVE_JOBS = makeConstant(BRANCH_NAME, "retrieve-jobs");
export const INCREMENT_PENDING_JOBS = makeConstant(BRANCH_NAME, "increment-pending-jobs");
export const DECREMENT_PENDING_JOBS = makeConstant(BRANCH_NAME, "decrement-pending-jobs");
