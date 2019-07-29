import {makeConstant} from "../util";

const BRANCH_NAME = "upload";

export const ASSOCIATE_FILES_AND_WELLS = makeConstant(BRANCH_NAME, "associate-files-and-wells");
export const UNDO_FILE_WELL_ASSOCIATION = makeConstant(BRANCH_NAME, "undo-file-well-association");
export const JUMP_TO_PAST_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-past");
export const JUMP_TO_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-upload");
export const CLEAR_UPLOAD_HISTORY = makeConstant(BRANCH_NAME, "clear-history");
export const DELETE_UPLOAD = makeConstant(BRANCH_NAME, "delete-upload");
export const INITIATE_UPLOAD = makeConstant(BRANCH_NAME, "initiate-upload");
export const UPDATE_UPLOAD = makeConstant(BRANCH_NAME, 'update-upload');
