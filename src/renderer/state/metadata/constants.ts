import { makeConstant } from "../util";

const BRANCH_NAME = "metadata";

export const CREATE_BARCODE = makeConstant(BRANCH_NAME, "create-barcode");
export const EXPORT_FILE_METADATA = makeConstant(BRANCH_NAME, "export-file-metadata");
export const GET_ANNOTATIONS = makeConstant(BRANCH_NAME, "get-annotations");
export const GET_BARCODE_SEARCH_RESULTS = makeConstant(BRANCH_NAME, "get-barcode-search-results");
export const GET_OPTIONS_FOR_LOOKUP = makeConstant(BRANCH_NAME, "get-options-for-lookup");
export const GET_TEMPLATES = makeConstant(BRANCH_NAME, "get-templates");
export const RECEIVE_METADATA = makeConstant(BRANCH_NAME, "receive");
export const REQUEST_METADATA = makeConstant(BRANCH_NAME, "request");
export const RESET_HISTORY = makeConstant(BRANCH_NAME, "reset-history");
export const SEARCH_FILE_METADATA = makeConstant(BRANCH_NAME, "search-file-metadata");
export const UPDATE_PAGE_HISTORY = makeConstant(BRANCH_NAME, "update-page-history");

export const MAIN_FILE_COLUMNS = ["filename", "positionIndex", "channel", "template"];
export const UNIMPORTANT_COLUMNS = [
    "localFilePath",
    "publicFilePath",
    "archiveFilePath",
    "thumbnailLocalFilePath",
    "uploaded",
    "uploadedBy",
    "modified",
    "modifiedBy",
    "fileType",
    "fileSize",
    "templateId",
    "fileId",
    "thumbnailId",
    "key",
];
