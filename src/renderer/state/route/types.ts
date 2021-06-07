import { JSSJob } from "../../services/job-status-client/types";
import { UploadServiceFields } from "../job/types";
import { Page, UploadStateBranch } from "../types";

export interface AppPageConfig {
  container: JSX.Element;
}

export interface CloseUploadAction {
  type: string;
}

export interface StartNewUploadAction {
  type: string;
}

export interface ResetUploadAction {
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

export interface OpenJobAsUploadAction {
  payload: JSSJob<UploadServiceFields>; // upload job associated with file metadata
  type: string;
}

export interface OpenJobAsUploadSucceededAction {
  payload: {
    originalUpload: UploadStateBranch;
  };
  type: string;
}

export interface Upload {
  templateId: number;
  uploadMetadata: UploadStateBranch;
}
