import { JSSJob } from "../../services/job-status-client/types";
import { Page, UploadStateBranch } from "../types";

export interface AppPageConfig {
  container: JSX.Element;
}

export interface CloseUploadTabAction {
  type: string;
}

export interface GoBackAction {
  type: string;
}

export interface NextPageAction {
  type: string;
}

export interface SelectPageAction {
  payload: {
    currentPage: Page;
    nextPage: Page;
  };
  type: string;
}

export interface SelectViewAction {
  payload: string;
  type: string;
}

export interface OpenEditFileMetadataTabAction {
  payload: JSSJob; // upload job associated with file metadata
  type: string;
}

export interface OpenEditFileMetadataTabSucceededAction {
  payload: {
    originalUpload: UploadStateBranch;
  };
  type: string;
}
