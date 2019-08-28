import { makeConstant } from "../util";

const BRANCH_NAME = "setting";

export const ADD_SCHEMA_FILE_PATH = makeConstant(BRANCH_NAME, "add-schema-file-path");
export const ASSOCIATE_BY_WORKFLOW = makeConstant(BRANCH_NAME, "associate-by-workflow");
export const REMOVE_SCHEMA_FILE_PATH = makeConstant(BRANCH_NAME, "remove-schema-file-path");
export const UPDATE_SETTINGS = makeConstant(BRANCH_NAME, "update-settings");
export const GATHER_SETTINGS = makeConstant(BRANCH_NAME, "gather-settings");
