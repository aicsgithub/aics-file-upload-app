import { BaseServiceFields } from "../../services/file-management-system/util";
import { JSSJob } from "../../services/job-status-client/types";
import { JobFilter, UploadProgressInfo } from "../types";

export interface ReceiveJobsAction {
  payload: JSSJob[];
  type: string;
}

export interface ReceiveJobInsertAction {
  payload: JSSJob<BaseServiceFields>;
  type: string;
}

export interface ReceiveJobUpdateAction<T extends BaseServiceFields = any> {
  payload: JSSJob<T>;
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
