import { makeConstant } from "../util";

const BRANCH_NAME = "setting";

export const UPDATE_SETTINGS = makeConstant(BRANCH_NAME, "update-settings");
export const GATHER_SETTINGS = makeConstant(BRANCH_NAME, "gather-settings");
export const CREATE_SCHEMA = makeConstant(BRANCH_NAME, "create-schema");
