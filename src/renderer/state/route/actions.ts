import { JSSJob } from "../../services/job-status-client/types";
import { Page, UploadStateBranch } from "../types";

import {
  CLOSE_SETTINGS,
  CLOSE_UPLOAD,
  OPEN_EDIT_FILE_METADATA_TAB,
  OPEN_EDIT_FILE_METADATA_TAB_SUCCEEDED,
  SELECT_PAGE,
  SELECT_VIEW,
} from "./constants";
import {
  CloseSettingsAction,
  CloseUploadAction,
  OpenEditFileMetadataTabAction,
  OpenEditFileMetadataTabSucceededAction,
  SelectPageAction,
  SelectViewAction,
} from "./types";

export function closeSettings(): CloseSettingsAction {
  return {
    type: CLOSE_SETTINGS,
  };
}

export function closeUpload(): CloseUploadAction {
  return {
    type: CLOSE_UPLOAD,
  };
}

export function selectPage(
  page: Page.AddCustomData | Page.UploadSummary
): SelectPageAction {
  return {
    payload: page,
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
