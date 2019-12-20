import { makeConstant } from "../util";

const BRANCH_NAME = "setting";

export const ASSOCIATE_BY_WORKFLOW = makeConstant(BRANCH_NAME, "associate-by-workflow");
export const GATHER_SETTINGS = makeConstant(BRANCH_NAME, "gather-settings");
export const SET_MOUNT_POINT = makeConstant(BRANCH_NAME, "set-mount-point");
export const UPDATE_SETTINGS = makeConstant(BRANCH_NAME, "update-settings");
