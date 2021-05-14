import { AnyAction } from "redux";

import { UploadServiceFields } from "../../services/aicsfiles/types";
import { JSSJob } from "../../services/job-status-client/types";
import { JobFilter, JobStateBranch, TypeToDescriptionMap } from "../types";
import { UPDATE_UPLOAD_PROGRESS_INFO } from "../upload/constants";
import { makeReducer } from "../util";

import {
  RECEIVE_JOB_INSERT,
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  SELECT_JOB_FILTER,
} from "./constants";
import { getJobIdToUploadJobMap } from "./selectors";
import {
  ReceiveJobsAction,
  ReceiveJobInsertAction,
  SelectJobFilterAction,
  UpdateUploadProgressInfoAction,
  ReceiveJobUpdateAction,
} from "./types";

export const initialState: JobStateBranch = {
  copyProgress: {},
  jobFilter: JobFilter.All,
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
      { payload: updatedJob }: ReceiveJobInsertAction
    ): JobStateBranch => {
      const jobType = updatedJob.serviceFields?.type;
      if (jobType === "upload") {
        return {
          ...state,
          uploadJobs: [updatedJob, ...state.uploadJobs],
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
      const jobIdToUploadJobMap: Map<
        string,
        JSSJob<UploadServiceFields>
      > = getJobIdToUploadJobMap(state);
      if (jobType === "upload" && jobIdToUploadJobMap.has(updatedJob.jobId)) {
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
      return state;
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
