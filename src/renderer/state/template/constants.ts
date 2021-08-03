import { makeConstant } from "../util";

const BRANCH_NAME = "template";

export const ADD_ANNOTATION = makeConstant(BRANCH_NAME, "add-annotation");
export const ADD_EXISTING_TEMPLATE = makeConstant(
  BRANCH_NAME,
  "add-existing-template"
);
export const CLEAR_TEMPLATE_DRAFT = makeConstant(
  BRANCH_NAME,
  "clear-template-draft"
);
export const CREATE_ANNOTATION = makeConstant(BRANCH_NAME, "create-annotation");
export const EDIT_ANNOTATION = makeConstant(BRANCH_NAME, "edit-annotation");
export const REMOVE_ANNOTATIONS = makeConstant(
  BRANCH_NAME,
  "remove-annotations"
);
export const ON_TEMPLATE_ANNOTATION_DRAG_END = makeConstant(
  BRANCH_NAME,
  "on-row-drag-end"
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
export const UPDATE_TEMPLATE_DRAFT = makeConstant(
  BRANCH_NAME,
  "update-template-draft"
);

export const START_TEMPLATE_DRAFT = makeConstant(
  BRANCH_NAME,
  "start-template-draft"
);
export const START_TEMPLATE_DRAFT_FAILED = makeConstant(
  BRANCH_NAME,
  "start-template-draft-failed"
);

export const DEFAULT_TEMPLATE_DRAFT = { annotations: [] };
