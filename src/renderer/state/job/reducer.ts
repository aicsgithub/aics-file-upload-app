import { AnyAction } from "redux";

import { JSSJob } from "../../services/job-status-client/types";
import { UploadServiceFields } from "../../services/types";
import { JobStateBranch, TypeToDescriptionMap } from "../types";
import {
  RECEIVE_MOST_RECENT_SUCCESSFUL_ETL,
  UPDATE_UPLOAD_PROGRESS_INFO,
} from "../upload/constants";
import { makeReducer } from "../util";

import {
  RECEIVE_JOB_INSERT,
  RECEIVE_JOB_UPDATE,
  SET_LAST_SELECTED_UPLOAD,
  RECEIVE_JOBS,
} from "./constants";
import {
  ReceiveJobInsertAction,
  UpdateUploadProgressInfoAction,
  ReceiveJobUpdateAction,
  SetLastSelectedUploadAction,
  ReceiveMostRecentSuccessfulETLAction,
  ReceiveJobsAction,
} from "./types";

export const initialState: JobStateBranch = {
  copyProgress: {},
  uploadJobs: [],
};

const actionToConfigMap: TypeToDescriptionMap<JobStateBranch> = {
  [RECEIVE_JOBS]: {
    accepts: (action: AnyAction): action is ReceiveJobsAction =>
      action.type === RECEIVE_JOBS,
    perform: (
      state: JobStateBranch,
      { payload: uploadJobs }: ReceiveJobsAction
    ) => {
      return {
        ...state,
        uploadJobs,
      };
    },
  },
  [RECEIVE_JOB_INSERT]: {
    accepts: (action: AnyAction): action is ReceiveJobInsertAction =>
      action.type === RECEIVE_JOB_INSERT,
    perform: (
      state: JobStateBranch,
      { payload: newJob }: ReceiveJobInsertAction
    ): JobStateBranch => {
      return {
        ...state,
        uploadJobs: [
          newJob as JSSJob<UploadServiceFields>,
          ...state.uploadJobs,
        ],
      };
    },
  },
  [RECEIVE_JOB_UPDATE]: {
    accepts: (action: AnyAction): action is ReceiveJobUpdateAction =>
      action.type === RECEIVE_JOB_UPDATE,
    perform: (
      state: JobStateBranch,
      { payload: updatedJob }: ReceiveJobUpdateAction
    ): JobStateBranch => {
      return {
        ...state,
        uploadJobs: state.uploadJobs.map((job) =>
          job.jobId === updatedJob.jobId
            ? (updatedJob as JSSJob<UploadServiceFields>)
            : job
        ),
      };
    },
  },
  [RECEIVE_MOST_RECENT_SUCCESSFUL_ETL]: {
    accepts: (
      action: AnyAction
    ): action is ReceiveMostRecentSuccessfulETLAction =>
      action.type === RECEIVE_MOST_RECENT_SUCCESSFUL_ETL,
    perform: (
      state: JobStateBranch,
      { payload }: ReceiveMostRecentSuccessfulETLAction
    ): JobStateBranch => {
      return {
        ...state,
        mostRecentSuccessfulETL: payload,
      };
    },
  },
  [SET_LAST_SELECTED_UPLOAD]: {
    accepts: (action: AnyAction): action is SetLastSelectedUploadAction =>
      action.type === SET_LAST_SELECTED_UPLOAD,
    perform: (state: JobStateBranch, action: SetLastSelectedUploadAction) => ({
      ...state,
      lastSelectedUpload: action.payload,
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
