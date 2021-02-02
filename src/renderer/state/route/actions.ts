import { JSSJob } from "../../services/job-status-client/types";
import { Page, UploadStateBranch } from "../types";

import {
  CLOSE_UPLOAD_TAB,
  OPEN_EDIT_FILE_METADATA_TAB,
  OPEN_EDIT_FILE_METADATA_TAB_SUCCEEDED,
  SELECT_PAGE,
  SELECT_VIEW,
} from "./constants";
import {
  CloseUploadTabAction,
  OpenEditFileMetadataTabAction,
  OpenEditFileMetadataTabSucceededAction,
  SelectPageAction,
  SelectViewAction,
} from "./types";

export function closeUploadTab(): CloseUploadTabAction {
  return {
    type: CLOSE_UPLOAD_TAB,
  };
}

export function selectPage(
  currentPage: Page,
  nextPage: Page
): SelectPageAction {
  return {
    payload: { currentPage, nextPage },
    type: SELECT_PAGE,
  };
}

export function selectView(view: Page): SelectViewAction {
  return {
    payload: view,
    type: SELECT_VIEW,
  };
}

export function openEditFileMetadataTab(
  job: JSSJob
): OpenEditFileMetadataTabAction {
  return {
    payload: job,
    type: OPEN_EDIT_FILE_METADATA_TAB,
  };
}

export function openEditFileMetadataTabSucceeded(
  originalUpload: UploadStateBranch
): OpenEditFileMetadataTabSucceededAction {
  return {
    payload: {
      originalUpload,
    },
    type: OPEN_EDIT_FILE_METADATA_TAB_SUCCEEDED,
  };
}
