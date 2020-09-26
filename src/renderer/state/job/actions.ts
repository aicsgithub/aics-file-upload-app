import { INCOMPLETE_JOB_IDS_KEY } from "../../../shared/constants";
import { BaseServiceFields } from "../../services/aicsfiles/types";
import { JSSJob } from "../../services/job-status-client/types";
import { JobFilter, UploadProgressInfo } from "../types";
import { UPDATE_UPLOAD_PROGRESS_INFO } from "../upload/constants";

import {
  GATHER_STORED_INCOMPLETE_JOB_IDS,
  HANDLE_ABANDONED_JOBS,
  RECEIVE_JOB_INSERT,
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  SELECT_JOB_FILTER,
  UPDATE_INCOMPLETE_JOB_IDS,
} from "./constants";
import {
  GatherIncompleteJobIdsAction,
  HandleAbandonedJobsAction,
  ReceiveJobsAction,
  ReceiveJobInsertAction,
  SelectJobFilterAction,
  UpdateIncompleteJobIdsAction,
  UpdateUploadProgressInfoAction,
  ReceiveJobUpdateAction,
} from "./types";

export function receiveJobs(
  uploadJobs: JSSJob[] = [],
  addMetadataJobs: JSSJob[] = [],
  incompleteJobIds: string[] = []
): ReceiveJobsAction {
  return {
    payload: {
      addMetadataJobs,
      incompleteJobIds,
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

export function gatherIncompleteJobIds(): GatherIncompleteJobIdsAction {
  return {
    type: GATHER_STORED_INCOMPLETE_JOB_IDS,
  };
}

export function updateIncompleteJobIds(
  incompleteJobIds: string[]
): UpdateIncompleteJobIdsAction {
  return {
    payload: incompleteJobIds,
    type: UPDATE_INCOMPLETE_JOB_IDS,
    updates: {
      [INCOMPLETE_JOB_IDS_KEY]: incompleteJobIds,
    },
    writeToStore: true,
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
