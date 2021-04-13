import { makeConstant } from "../util";

const BRANCH_NAME = "template";

export const CREATE_ANNOTATION = makeConstant(BRANCH_NAME, "create-annotation");
export const CREATE_ANNOTATION_OPTIONS = makeConstant(
  BRANCH_NAME,
  "create-annotation-options"
);
export const SAVE_TEMPLATE = makeConstant(BRANCH_NAME, "save-template");
export const SAVE_TEMPLATE_SUCCEEDED = makeConstant(
  BRANCH_NAME,
  "save-template-succeeded"
);
export const SET_APPLIED_TEMPLATE = makeConstant(
  BRANCH_NAME,
  "set-applied-template"
);
