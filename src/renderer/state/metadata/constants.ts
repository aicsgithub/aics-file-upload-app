import { makeConstant } from "../util";

const BRANCH_NAME = "metadata";

export const CREATE_BARCODE = makeConstant(BRANCH_NAME, "create-barcode");
export const GET_ANNOTATIONS = makeConstant(BRANCH_NAME, "get-annotations");
export const GET_BARCODE_SEARCH_RESULTS = makeConstant(BRANCH_NAME, "get-barcode-search-results");
export const RECEIVE_METADATA = makeConstant(BRANCH_NAME, "receive");
export const REQUEST_METADATA = makeConstant(BRANCH_NAME, "request");
export const UPDATE_PAGE_HISTORY = makeConstant(BRANCH_NAME, "update-page-history");
