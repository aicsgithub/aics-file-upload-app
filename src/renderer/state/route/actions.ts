import { JSSJob } from "../../services/job-status-client/types";
import { Page, UploadStateBranch } from "../types";

import {
  CLOSE_UPLOAD,
  OPEN_JOB_AS_UPLOAD,
  OPEN_JOB_AS_UPLOAD_SUCCEEDED,
  RESET_UPLOAD,
  SELECT_PAGE,
  SELECT_VIEW,
  START_NEW_UPLOAD,
} from "./constants";
import {
  CloseUploadAction,
  OpenJobAsUploadAction,
  OpenJobAsUploadSucceededAction,
  ResetUploadAction,
  SelectPageAction,
  SelectViewAction,
  StartNewUploadAction,
} from "./types";

export function closeUpload(): CloseUploadAction {
  return {
    type: CLOSE_UPLOAD,
  };
}

export function startNewUpload(): StartNewUploadAction {
  return {
    type: START_NEW_UPLOAD,
  };
}

export function resetUpload(): ResetUploadAction {
  return {
    type: RESET_UPLOAD,
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

export function openJobAsUpload(job: JSSJob): OpenJobAsUploadAction {
  return {
    payload: job,
    type: OPEN_JOB_AS_UPLOAD,
  };
}

export function openJobAsUploadSucceeded(
  originalUpload: UploadStateBranch
): OpenJobAsUploadSucceededAction {
  return {
    payload: {
      originalUpload,
    },
    type: OPEN_JOB_AS_UPLOAD_SUCCEEDED,
  };
}
