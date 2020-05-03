import { uniq, without } from "lodash";
import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import {
    INITIATE_UPLOAD,
    RETRY_UPLOAD,
    RETRY_UPLOAD_FAILED,
    RETRY_UPLOAD_SUCCEEDED,
} from "../upload/constants";
import {
    InitiateUploadAction,
    RetryUploadAction,
    RetryUploadFailedAction,
    RetryUploadSucceededAction,
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
    JobFilter,
    JobStateBranch,
    ReceiveJobsAction,
    SelectJobFilterAction,
    StartJobPollAction,
    StopJobPollAction,
     UpdateIncompleteJobIdsAction,
} from "./types";

export const initialState: JobStateBranch = {
    addMetadataJobs: [],
    copyJobs: [],
    inProgressUploadJobs: [],
    incompleteJobIds: [],
    jobFilter: JobFilter.InProgress,
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
                      inProgressUploadJobs,
                      incompleteJobIds,
                      uploadJobs,
                  }}: ReceiveJobsAction) => {
            return {
                ...state,
                addMetadataJobs,
                copyJobs,
                inProgressUploadJobs,
                incompleteJobIds: uniq(incompleteJobIds),
                uploadJobs,
            };
        },
    },
    [UPDATE_INCOMPLETE_JOB_IDS]: {
        accepts: (action: AnyAction):
            action is UpdateIncompleteJobIdsAction => action.type === UPDATE_INCOMPLETE_JOB_IDS,
        perform: (state: JobStateBranch, action: UpdateIncompleteJobIdsAction) => {
            return {
                ...state,
                incompleteJobIds: action.payload,
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
    [INITIATE_UPLOAD]: {
        accepts: (action: AnyAction): action is InitiateUploadAction =>
            action.type === INITIATE_UPLOAD,
        perform: (state: JobStateBranch, action: InitiateUploadAction) => ({
            ...state,
            incompleteJobIds: uniq(action.payload.incompleteJobIds),
        }),
    },
    [RETRY_UPLOAD]: {
        accepts: (action: AnyAction): action is RetryUploadAction =>
            action.type === RETRY_UPLOAD,
        perform: (state: JobStateBranch, action: RetryUploadAction) => ({
            ...state,
            incompleteJobIds: uniq([...state.incompleteJobIds, action.payload.jobId]),
        }),
    },
    [RETRY_UPLOAD_SUCCEEDED]: {
        accepts: (action: AnyAction): action is RetryUploadSucceededAction =>
            action.type === RETRY_UPLOAD_SUCCEEDED,
        perform: (state: JobStateBranch, action: RetryUploadSucceededAction) => ({
            ...state,
            incompleteJobIds: without(state.incompleteJobIds, action.payload.jobId),
        }),
    },
    [RETRY_UPLOAD_FAILED]: {
        accepts: (action: AnyAction): action is RetryUploadFailedAction =>
            action.type === RETRY_UPLOAD_FAILED,
        perform: (state: JobStateBranch, action: RetryUploadFailedAction) => ({
            ...state,
            incompleteJobIds: without(state.incompleteJobIds, action.payload.row.jobId),
        }),
    },
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);
