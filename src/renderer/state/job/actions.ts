import { BaseServiceFields } from "../../services/aicsfiles/types";
import { JSSJob } from "../../services/job-status-client/types";
import { JobFilter, UploadProgressInfo } from "../types";
import { UPDATE_UPLOAD_PROGRESS_INFO } from "../upload/constants";

import {
  HANDLE_ABANDONED_JOBS,
  RECEIVE_JOB_INSERT,
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  SELECT_JOB_FILTER,
} from "./constants";
import {
  HandleAbandonedJobsAction,
  ReceiveJobsAction,
  ReceiveJobInsertAction,
  SelectJobFilterAction,
  UpdateUploadProgressInfoAction,
  ReceiveJobUpdateAction,
} from "./types";

export function receiveJobs(
  uploadJobs: JSSJob[] = [],
  addMetadataJobs: JSSJob[] = []
): ReceiveJobsAction {
  return {
    payload: {
      addMetadataJobs,
      uploadJobs,
    },
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

export function receiveJobUpdate(
  job: JSSJob<BaseServiceFields>
): ReceiveJobUpdateAction {
  return {
    payload: job,
    type: RECEIVE_JOB_UPDATE,
  };
}

export function handleAbandonedJobs(): HandleAbandonedJobsAction {
  return {
    type: HANDLE_ABANDONED_JOBS,
  };
}

export function selectJobFilter(jobFilter: JobFilter): SelectJobFilterAction {
  return {
    payload: jobFilter,
    type: SELECT_JOB_FILTER,
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
