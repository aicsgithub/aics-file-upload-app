import { JSSJob } from "../../services/job-status-client/types";
import { BaseServiceFields } from "../../services/types";
import { UploadProgressInfo } from "../types";
import {
  RECEIVE_MOST_RECENT_SUCCESSFUL_ETL,
  REQUEST_MOST_RECENT_SUCCESSFUL_ETL,
  UPDATE_UPLOAD_PROGRESS_INFO,
} from "../upload/constants";

import {
  RECEIVE_JOB_INSERT,
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  SET_LAST_SELECTED_UPLOAD,
  RECEIVE_ETL_JOBS,
} from "./constants";
import {
  ReceiveJobsAction,
  ReceiveJobInsertAction,
  UpdateUploadProgressInfoAction,
  ReceiveJobUpdateAction,
  SetLastSelectedUploadAction,
  ReceiveETLJobsAction,
  RequestMostRecentSuccessfulETLAction,
  ReceiveMostRecentSuccessfulETLAction,
} from "./types";

export function receiveJobs(uploadJobs: JSSJob[] = []): ReceiveJobsAction {
  return {
    payload: uploadJobs,
    type: RECEIVE_JOBS,
  };
}

export function receiveETLJobs(
  etlJobs: JSSJob<BaseServiceFields>[]
): ReceiveETLJobsAction {
  return {
    payload: etlJobs,
    type: RECEIVE_ETL_JOBS,
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

export function setLastSelectedUpload(row?: {
  id: string;
  index: number;
}): SetLastSelectedUploadAction {
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

export function requestMostRecentSuccessfulETL(): RequestMostRecentSuccessfulETLAction {
  return {
    type: REQUEST_MOST_RECENT_SUCCESSFUL_ETL,
  };
}

export function receiveMostRecentSuccessfulEtl(
  etlEndTimeInMS: number
): ReceiveMostRecentSuccessfulETLAction {
  return {
    payload: etlEndTimeInMS,
    type: RECEIVE_MOST_RECENT_SUCCESSFUL_ETL,
  };
}
