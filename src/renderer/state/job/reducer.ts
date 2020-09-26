import { uniq } from "lodash";
import { AnyAction } from "redux";

import { UploadServiceFields } from "../../services/aicsfiles/types";
import { JSSJob } from "../../services/job-status-client/types";
import { JobFilter, JobStateBranch, TypeToDescriptionMap } from "../types";
import {
  CANCEL_UPLOAD,
  INITIATE_UPLOAD_SUCCEEDED,
  RETRY_UPLOAD,
  RETRY_UPLOAD_FAILED,
  RETRY_UPLOAD_SUCCEEDED,
  UPDATE_UPLOAD_PROGRESS_INFO,
  UPLOAD_FAILED,
  UPLOAD_SUCCEEDED,
} from "../upload/constants";
import {
  CancelUploadAction,
  InitiateUploadSucceededAction,
  RetryUploadAction,
  RetryUploadFailedAction,
  RetryUploadSucceededAction,
  UploadFailedAction,
  UploadSucceededAction,
} from "../upload/types";
import { makeReducer } from "../util";

import {
  RECEIVE_JOB_INSERT,
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  SELECT_JOB_FILTER,
  UPDATE_INCOMPLETE_JOB_IDS,
} from "./constants";
import {
  ReceiveJobsAction,
  ReceiveJobInsertAction,
  SelectJobFilterAction,
  UpdateIncompleteJobIdsAction,
  UpdateUploadProgressInfoAction,
  ReceiveJobUpdateAction,
} from "./types";

export const initialState: JobStateBranch = {
  addMetadataJobs: [],
  copyProgress: {},
  incompleteJobIds: [],
  jobFilter: JobFilter.All,
  uploadJobs: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
  [RECEIVE_JOBS]: {
    accepts: (action: AnyAction): action is ReceiveJobsAction =>
      action.type === RECEIVE_JOBS,
    perform: (
      state: JobStateBranch,
      {
        payload: { addMetadataJobs, incompleteJobIds, uploadJobs },
      }: ReceiveJobsAction
    ) => {
      return {
        ...state,
        addMetadataJobs,
        incompleteJobIds: uniq(incompleteJobIds),
        uploadJobs,
      };
    },
  },
  [RECEIVE_JOB_INSERT]: {
    accepts: (action: AnyAction): action is ReceiveJobInsertAction =>
      action.type === RECEIVE_JOB_INSERT,
    perform: (
      state: JobStateBranch,
      { payload: updatedJob }: ReceiveJobInsertAction
    ): JobStateBranch => {
      const jobType = updatedJob.serviceFields?.type;
      if (jobType === "upload") {
        return {
          ...state,
          uploadJobs: [
            updatedJob as JSSJob<UploadServiceFields>,
            ...state.uploadJobs,
          ],
        };
      }

      if (jobType === "add_metadata") {
        return {
          ...state,
          addMetadataJobs: [updatedJob, ...state.addMetadataJobs],
        };
      }

      return state;
    },
  },
  [RECEIVE_JOB_UPDATE]: {
    accepts: (action: AnyAction): action is ReceiveJobUpdateAction =>
      action.type === RECEIVE_JOB_UPDATE,
    perform: (
      state: JobStateBranch,
      { payload: updatedJob }: ReceiveJobUpdateAction
    ): JobStateBranch => {
      const jobType = updatedJob.serviceFields?.type;
      if (jobType === "upload") {
        // Replace job with changed job
        return {
          ...state,
          uploadJobs: state.uploadJobs.map((job) =>
            job.jobId === updatedJob.jobId
              ? (updatedJob as JSSJob<UploadServiceFields>)
              : job
          ),
        };
      }

      if (jobType === "add_metadata") {
        return {
          ...state,
          addMetadataJobs: state.addMetadataJobs.map((job) =>
            job.jobId === updatedJob.jobId ? (updatedJob as JSSJob) : job
          ),
        };
      }

      return state;
    },
  },
  [UPDATE_INCOMPLETE_JOB_IDS]: {
    accepts: (action: AnyAction): action is UpdateIncompleteJobIdsAction =>
      action.type === UPDATE_INCOMPLETE_JOB_IDS,
    perform: (state: JobStateBranch, action: UpdateIncompleteJobIdsAction) => {
      return {
        ...state,
        incompleteJobIds: action.payload,
      };
    },
  },
  [SELECT_JOB_FILTER]: {
    accepts: (action: AnyAction): action is SelectJobFilterAction =>
      action.type === SELECT_JOB_FILTER,
    perform: (state: JobStateBranch, action: SelectJobFilterAction) => {
      return {
        ...state,
        jobFilter: action.payload,
      };
    },
  },
  [RETRY_UPLOAD]: {
    accepts: (action: AnyAction): action is RetryUploadAction =>
      action.type === RETRY_UPLOAD,
    perform: (
      state: JobStateBranch,
      { payload: { recentJobs } }: RetryUploadAction
    ) => ({
      ...state,
      incompleteJobIds: recentJobs,
    }),
  },
  [RETRY_UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is RetryUploadSucceededAction =>
      action.type === RETRY_UPLOAD_SUCCEEDED,
    perform: (
      state: JobStateBranch,
      { payload: { recentJobs } }: RetryUploadSucceededAction
    ) => ({
      ...state,
      incompleteJobIds: recentJobs,
    }),
  },
  [RETRY_UPLOAD_FAILED]: {
    accepts: (action: AnyAction): action is RetryUploadFailedAction =>
      action.type === RETRY_UPLOAD_FAILED,
    perform: (
      state: JobStateBranch,
      { payload: { recentJobs } }: RetryUploadFailedAction
    ) => ({
      ...state,
      incompleteJobIds: recentJobs,
    }),
  },
  [UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is UploadSucceededAction =>
      action.type === UPLOAD_SUCCEEDED,
    perform: (
      state: JobStateBranch,
      { payload: { recentJobs } }: UploadSucceededAction
    ) => ({
      ...state,
      incompleteJobIds: recentJobs,
    }),
  },
  [UPLOAD_FAILED]: {
    accepts: (action: AnyAction): action is UploadFailedAction =>
      action.type === UPLOAD_FAILED,
    perform: (
      state: JobStateBranch,
      { payload: { recentJobs } }: UploadFailedAction
    ) => ({
      ...state,
      incompleteJobIds: recentJobs,
    }),
  },
  [CANCEL_UPLOAD]: {
    accepts: (action: AnyAction): action is CancelUploadAction =>
      action.type === CANCEL_UPLOAD,
    perform: (state: JobStateBranch, action: CancelUploadAction) => ({
      ...state,
      incompleteJobIds: action.payload.recentJobs,
    }),
  },
  [INITIATE_UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is InitiateUploadSucceededAction =>
      action.type === INITIATE_UPLOAD_SUCCEEDED,
    perform: (
      state: JobStateBranch,
      { payload: { recentJobs } }: InitiateUploadSucceededAction
    ) => ({
      ...state,
      incompleteJobIds: recentJobs,
    }),
  },
  [UPDATE_UPLOAD_PROGRESS_INFO]: {
    accepts: (action: AnyAction): action is UpdateUploadProgressInfoAction =>
      action.type === UPDATE_UPLOAD_PROGRESS_INFO,
    perform: (
      state: JobStateBranch,
      { payload: { jobId, progress } }: UpdateUploadProgressInfoAction
    ) => ({
      ...state,
      copyProgress: {
        ...state.copyProgress,
        [jobId]: progress,
      },
    }),
  },
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);
