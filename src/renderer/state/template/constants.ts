import { makeConstant } from "../util";

const BRANCH_NAME = "template";

export const CLEAR_TEMPLATE_HISTORY = makeConstant(BRANCH_NAME, "clear-template-history");
export const SAVE_TEMPLATE = makeConstant(BRANCH_NAME, "savee-template");
export const GET_TEMPLATE = makeConstant(BRANCH_NAME, "get-template");
export const JUMP_TO_PAST_TEMPLATE = makeConstant(BRANCH_NAME, "jump-to-past-template");
export const JUMP_TO_TEMPLATE = makeConstant(BRANCH_NAME, "jump-to-template");
export const UPDATE_TEMPLATE_DRAFT = makeConstant(BRANCH_NAME, "update-template-draft");
