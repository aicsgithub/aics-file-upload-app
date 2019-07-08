import { makeConstant } from "../util";

const BRANCH_NAME = "jobs";

export const SET_JOBS = makeConstant(BRANCH_NAME, "set-jobs");
export const RETRIEVE_JOBS = makeConstant(BRANCH_NAME, "retrieve-jobs");
