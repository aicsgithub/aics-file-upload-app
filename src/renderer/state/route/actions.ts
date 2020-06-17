import { JSSJob } from "@aics/job-status-client/type-declarations/types";

import { UploadStateBranch } from "../upload/types";

import {
  CLOSE_UPLOAD_TAB,
  GO_BACK,
  GO_FORWARD,
  OPEN_EDIT_FILE_METADATA_TAB,
  OPEN_EDIT_FILE_METADATA_TAB_FAILED,
  OPEN_EDIT_FILE_METADATA_TAB_SUCCEEDED,
  SELECT_PAGE,
  SELECT_VIEW,
} from "./constants";
import {
  CloseUploadTabAction,
  GoBackAction,
  NextPageAction,
  OpenEditFileMetadataTabAction,
  OpenEditFileMetadataTabFailedAction,
  OpenEditFileMetadataTabSucceededAction,
  Page,
  SelectPageAction,
  SelectViewAction,
} from "./types";

export function closeUploadTab(): CloseUploadTabAction {
  return {
    type: CLOSE_UPLOAD_TAB,
  };
}

export function goBack(): GoBackAction {
  return {
    type: GO_BACK,
  };
}

export function goForward(): NextPageAction {
  return {
    type: GO_FORWARD,
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

export function selectView(view: string): SelectViewAction {
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

export function openEditFileMetadataTabFailed(
  error: string
): OpenEditFileMetadataTabFailedAction {
  return {
    payload: error,
    type: OPEN_EDIT_FILE_METADATA_TAB_FAILED,
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
