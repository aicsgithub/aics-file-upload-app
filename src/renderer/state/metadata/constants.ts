import { makeConstant } from "../util";

const BRANCH_NAME = "metadata";

export const CLEAR_CURRENT_UPLOAD = makeConstant(
  BRANCH_NAME,
  "clear-current-upload"
);
export const CLEAR_OPTIONS_FOR_LOOKUP = makeConstant(
  BRANCH_NAME,
  "clear-options-for-lookup"
);
export const CREATE_BARCODE = makeConstant(BRANCH_NAME, "create-barcode");
export const GET_BARCODE_SEARCH_RESULTS = makeConstant(
  BRANCH_NAME,
  "get-barcode-search-results"
);
export const GET_OPTIONS_FOR_LOOKUP = makeConstant(
  BRANCH_NAME,
  "get-options-for-lookup"
);
export const GET_TEMPLATES = makeConstant(BRANCH_NAME, "get-templates");
export const RECEIVE_METADATA = makeConstant(BRANCH_NAME, "receive");
export const REQUEST_METADATA = makeConstant(BRANCH_NAME, "request");
export const RESET_HISTORY = makeConstant(BRANCH_NAME, "reset-history");
export const REQUEST_ANNOTATION_USAGE = makeConstant(
  BRANCH_NAME,
  "request-annotation-usage"
);
export const RECEIVE_ANNOTATION_USAGE = makeConstant(
  BRANCH_NAME,
  "receive-annotation-usage"
);
export const CLEAR_FILE_METADATA_FOR_JOB = makeConstant(
  BRANCH_NAME,
  "clear-file-metadata-for-job"
);
export const UPDATE_PAGE_HISTORY = makeConstant(
  BRANCH_NAME,
  "update-page-history"
);

export const MAIN_FILE_COLUMNS = [
  "filename",
  "positionIndex",
  "channel",
  "template",
];
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
