import { Row } from "react-table";

import { JSSJob } from "../../services/job-status-client/types";
import { BaseServiceFields } from "../../services/types";
import { JobFilter, UploadProgressInfo } from "../types";
import { UPDATE_UPLOAD_PROGRESS_INFO } from "../upload/constants";

import {
  RECEIVE_JOB_INSERT,
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  SELECT_JOB_FILTER,
  SET_LAST_SELECTED_UPLOAD,
} from "./constants";
import {
  ReceiveJobsAction,
  ReceiveJobInsertAction,
  SelectJobFilterAction,
  UpdateUploadProgressInfoAction,
  ReceiveJobUpdateAction,
  SetLastSelectedUploadAction,
} from "./types";

export function receiveJobs(uploadJobs: JSSJob[] = []): ReceiveJobsAction {
  return {
    payload: uploadJobs,
    type: RECEIVE_JOBS,
  };
}

export function receiveJobInsert(
  job: JSSJob<BaseServiceFields>
): ReceiveJobInsertAction {
  return {
    payload: job,
    type: RECEIVE_JOB_INSERT,
  };
}

export function receiveJobUpdate<T extends BaseServiceFields = any>(
  job: JSSJob<T>
): ReceiveJobUpdateAction {
  return {
    payload: job,
    type: RECEIVE_JOB_UPDATE,
  };
}

export function selectJobFilter(jobFilter: JobFilter): SelectJobFilterAction {
  return {
    payload: jobFilter,
    type: SELECT_JOB_FILTER,
  };
}

export function setLastSelectedUpload(
  row: Row<any>
): SetLastSelectedUploadAction {
  return {
    payload: row,
    type: SET_LAST_SELECTED_UPLOAD,
  };
}

export function updateUploadProgressInfo(
  jobId: string,
  progress: UploadProgressInfo
): UpdateUploadProgressInfoAction {
  return {
    payload: {
      jobId,
      progress,
    },
    type: UPDATE_UPLOAD_PROGRESS_INFO,
  };
}
