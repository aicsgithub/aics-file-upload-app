import { UploadServiceFields } from "../../services/aicsfiles/types";
import { JSSJob } from "../../services/job-status-client/types";
import { Page, UploadStateBranch } from "../types";

export interface AppPageConfig {
  container: JSX.Element;
}

export interface CloseUploadAction {
  type: string;
}

export interface SelectPageAction {
  payload: Page.AddCustomData | Page.UploadSummary;
  type: string;
}

export interface SelectViewAction {
  payload: Page;
  type: string;
}

export interface OpenEditFileMetadataTabAction {
  payload: JSSJob<UploadServiceFields>; // upload job associated with file metadata
  type: string;
}

export interface OpenEditFileMetadataTabSucceededAction {
  payload: {
    originalUpload: UploadStateBranch;
  };
  type: string;
}
