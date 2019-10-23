import { makeConstant } from "../util";

const BRANCH_NAME = "setting";

export const ADD_TEMPLATE_ID_TO_SETTINGS = makeConstant(BRANCH_NAME, "add-template-id");
export const ASSOCIATE_BY_WORKFLOW = makeConstant(BRANCH_NAME, "associate-by-workflow");
export const REMOVE_TEMPLATE_ID_FROM_SETTINGS = makeConstant(BRANCH_NAME, "remove-template-id-from-settings");
export const UPDATE_SETTINGS = makeConstant(BRANCH_NAME, "update-settings");
export const GATHER_SETTINGS = makeConstant(BRANCH_NAME, "gather-settings");
