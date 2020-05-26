import { makeConstant } from "../util";

import { Page } from "./types";

const BRANCH_NAME = "route";

export const CLOSE_UPLOAD_TAB = makeConstant(BRANCH_NAME, "close-upload-tab");
export const GO_BACK = makeConstant(BRANCH_NAME, "go-back");
export const GO_FORWARD = makeConstant(BRANCH_NAME, "go-forward");
export const OPEN_EDIT_FILE_METADATA_TAB = makeConstant(
  BRANCH_NAME,
  "open-edit-file-metadata-tab"
);
export const SELECT_PAGE = makeConstant(BRANCH_NAME, "select-page");
export const SELECT_VIEW = makeConstant(BRANCH_NAME, "select-view");

export const pageOrder: Page[] = [
  Page.DragAndDrop,
  Page.SelectUploadType,
  Page.AssociateFiles,
  Page.SelectStorageLocation,
  Page.AddCustomData,
  Page.UploadSummary,
];
/***
 * Helper function for getting a page relative to a given page. Returns null if direction is out of bounds or
 * if current page is not recognized.
 * @param currentPage page to start at
 * @param direction number of steps forward or back (negative) from currentPage
 */
export const findNextPage = (
  currentPage: Page,
  direction: number
): Page | null => {
  const currentPageIndex = pageOrder.indexOf(currentPage);
  if (currentPageIndex > -1) {
    const nextPageIndex = currentPageIndex + direction;

    if (nextPageIndex < 0) {
      return pageOrder[pageOrder.length - 1];
    }

    if (nextPageIndex > -1 && nextPageIndex < pageOrder.length) {
      return pageOrder[nextPageIndex];
    }
  }

  return null;
};
