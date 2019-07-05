import { makeConstant } from "../util";

const BRANCH_NAME = "metadata";

export const CREATE_BARCODE = makeConstant(BRANCH_NAME, "create-barcode");
export const RECEIVE_METADATA = makeConstant(BRANCH_NAME, "receive");
export const REQUEST_METADATA = makeConstant(BRANCH_NAME, "request");
export const GET_IMAGING_SESSIONS = makeConstant(BRANCH_NAME, "get-imaging-sessions");
export const GET_BARCODE_PREFIXES = makeConstant(BRANCH_NAME, "get-barcode-prefixes");
export const UPDATE_PAGE_HISTORY = makeConstant(BRANCH_NAME, "update-page-history");
