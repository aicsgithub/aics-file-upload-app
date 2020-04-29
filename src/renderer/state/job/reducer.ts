import { filter, includes, uniqBy } from "lodash";
import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    ADD_PENDING_JOB,
    RECEIVE_JOBS,
    REMOVE_PENDING_JOB,
    SELECT_JOB_FILTER,
    START_JOB_POLL,
    STOP_JOB_POLL,
    UPDATE_INCOMPLETE_JOB_NAMES,
} from "./constants";
import {
    AddPendingJobAction,
    JobFilter,
    JobStateBranch,
    ReceiveJobsAction,
    RemovePendingJobsAction,
    SelectJobFilterAction,
    StartJobPollAction,
    StopJobPollAction,
    UpdateIncompleteJobNamesAction,
} from "./types";

export const initialState: JobStateBranch = {
    addMetadataJobs: [],
    copyJobs: [],
    inProgressUploadJobs: [],
    incompleteJobNames: [],
    jobFilter: JobFilter.InProgress,
    pendingJobs: [],
    polling: false,
    uploadJobs: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [RECEIVE_JOBS]: {
        accepts: (action: AnyAction): action is ReceiveJobsAction => action.type === RECEIVE_JOBS,
        perform: (state: JobStateBranch,
                  { payload: {
                      addMetadataJobs,
                      copyJobs,
                      incompleteJobNames,
                      pendingJobNamesToRemove,
                      uploadJobs,
                  }}: ReceiveJobsAction) => {
            return {
                ...state,
                addMetadataJobs,
                copyJobs,
                incompleteJobNames,
                pendingJobs: filter(state.pendingJobs,
                    ({jobName}) => !includes(pendingJobNamesToRemove, jobName)),
                uploadJobs,
            };
        },
    },
    [UPDATE_INCOMPLETE_JOB_NAMES]: {
        accepts: (action: AnyAction):
            action is UpdateIncompleteJobNamesAction => action.type === UPDATE_INCOMPLETE_JOB_NAMES,
        perform: (state: JobStateBranch, action: UpdateIncompleteJobNamesAction) => {
            return {
                ...state,
                incompleteJobNames: action.payload,
            };
        },
    },
    [ADD_PENDING_JOB]: {
        accepts: (action: AnyAction): action is AddPendingJobAction => action.type === ADD_PENDING_JOB,
        perform: (state: JobStateBranch, action: AddPendingJobAction) => {
            return {
                ...state,
                pendingJobs: uniqBy([...state.pendingJobs, action.payload], "jobName"),
            };
        },
    },
    [REMOVE_PENDING_JOB]: {
        accepts: (action: AnyAction): action is RemovePendingJobsAction => action.type === REMOVE_PENDING_JOB,
        perform: (state: JobStateBranch, action: RemovePendingJobsAction) => {
            return {
                ...state,
                pendingJobs: filter(state.pendingJobs, ({jobName}) => !includes(action.payload, jobName)),
            };
        },
    },
    [SELECT_JOB_FILTER]: {
        accepts: (action: AnyAction): action is SelectJobFilterAction => action.type === SELECT_JOB_FILTER,
        perform: (state: JobStateBranch, action: SelectJobFilterAction) => {
            return {
                ...state,
                jobFilter: action.payload,
            };
        },
    },
    [START_JOB_POLL]: {
        accepts: (action: AnyAction): action is StartJobPollAction => action.type === START_JOB_POLL,
        perform: (state: JobStateBranch) => ({
            ...state,
            polling: true,
        }),
    },
    [STOP_JOB_POLL]: {
        accepts: (action: AnyAction): action is StopJobPollAction => action.type === STOP_JOB_POLL,
        perform: (state: JobStateBranch) => ({
            ...state,
            polling: false,
        }),
    },
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);
