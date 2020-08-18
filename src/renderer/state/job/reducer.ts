import { uniq } from "lodash";
import { AnyAction } from "redux";

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
  RECEIVE_JOBS,
  SELECT_JOB_FILTER,
  START_JOB_POLL,
  STOP_JOB_POLL,
  UPDATE_INCOMPLETE_JOB_IDS,
} from "./constants";
import {
  ReceiveJobsAction,
  SelectJobFilterAction,
  StartJobPollAction,
  StopJobPollAction,
  UpdateIncompleteJobIdsAction,
  UpdateUploadProgressInfoAction,
} from "./types";

export const initialState: JobStateBranch = {
  addMetadataJobs: [],
  copyProgress: {},
  incompleteJobIds: [],
  jobFilter: JobFilter.All,
  polling: false,
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
  [START_JOB_POLL]: {
    accepts: (action: AnyAction): action is StartJobPollAction =>
      action.type === START_JOB_POLL,
    perform: (state: JobStateBranch) => ({
      ...state,
      polling: true,
    }),
  },
  [STOP_JOB_POLL]: {
    accepts: (action: AnyAction): action is StopJobPollAction =>
      action.type === STOP_JOB_POLL,
    perform: (state: JobStateBranch) => ({
      ...state,
      polling: false,
    }),
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
      polling: true,
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
      polling: true,
    }),
  },
  [INITIATE_UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is InitiateUploadSucceededAction =>
      action.type === INITIATE_UPLOAD_SUCCEEDED,
    perform: (
      state: JobStateBranch,
      action: InitiateUploadSucceededAction
    ) => ({
      ...state,
      incompleteJobIds: action.payload.recentJobs,
      polling: true,
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
