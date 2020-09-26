import { BaseServiceFields } from "../../services/aicsfiles/types";
import { JSSJob } from "../../services/job-status-client/types";
import { JobFilter, UploadProgressInfo, WriteToStoreAction } from "../types";

export interface ReceiveJobsAction {
  payload: {
    addMetadataJobs: JSSJob[];
    incompleteJobIds: string[];
    uploadJobs: JSSJob[];
  };
  type: string;
}

export interface ReceiveJobInsertAction {
  payload: JSSJob<BaseServiceFields>;
  type: string;
}

export interface ReceiveJobUpdateAction {
  payload: JSSJob<BaseServiceFields>;
  type: string;
}

export interface HandleAbandonedJobsAction {
  type: string;
}

export interface GatherIncompleteJobIdsAction {
  type: string;
}

export interface UpdateIncompleteJobIdsAction extends WriteToStoreAction {
  payload: string[];
  type: string;
}

export interface SelectJobFilterAction {
  payload: JobFilter;
  type: string;
}

export interface UpdateUploadProgressInfoAction {
  payload: {
    jobId: string;
    progress: UploadProgressInfo;
  };
  type: string;
}
