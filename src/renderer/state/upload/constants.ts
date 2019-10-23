import { makeConstant } from "../util";

const BRANCH_NAME = "upload";

export const APPLY_TEMPLATE = makeConstant(BRANCH_NAME, "apply-template");
export const ASSOCIATE_FILES_AND_WELLS = makeConstant(BRANCH_NAME, "associate-files-and-wells");
export const ASSOCIATE_FILES_AND_WORKFLOWS = makeConstant(BRANCH_NAME, "associate-files-and-workflows");
export const UNDO_FILE_WELL_ASSOCIATION = makeConstant(BRANCH_NAME, "undo-file-well-association");
export const UNDO_FILE_WORKFLOW_ASSOCIATION = makeConstant(BRANCH_NAME, "undo-file-workflow-association");
export const JUMP_TO_PAST_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-past");
export const JUMP_TO_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-upload");
export const CLEAR_UPLOAD_HISTORY = makeConstant(BRANCH_NAME, "clear-history");
export const DELETE_UPLOAD = makeConstant(BRANCH_NAME, "delete-upload");
export const INITIATE_UPLOAD = makeConstant(BRANCH_NAME, "initiate-upload");
export const UPDATE_UPLOAD = makeConstant(BRANCH_NAME, "update-upload");
export const RETRY_UPLOAD = makeConstant(BRANCH_NAME, "retry-upload");
