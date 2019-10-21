import { makeConstant } from "../util";

const BRANCH_NAME = "template";

export const CREATE_TEMPLATE = makeConstant(BRANCH_NAME, "create-template");
export const EDIT_TEMPLATE = makeConstant(BRANCH_NAME, "edit-template");
export const GET_ANNOTATIONS = makeConstant(BRANCH_NAME, "get-annotations");
