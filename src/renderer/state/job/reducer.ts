import { filter, includes, uniqBy } from "lodash";
import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    ADD_PENDING_JOB,
    REMOVE_PENDING_JOB,
    RETRIEVE_JOBS,
    SELECT_JOB_FILTER,
    SET_ADD_METADATA_JOBS,
    SET_COPY_JOBS,
    SET_UPLOAD_JOBS,
    STOP_JOB_POLL,
    UPDATE_INCOMPLETE_JOB_NAMES,
} from "./constants";
import {
    AddPendingJobAction,
    JobFilter,
    JobStateBranch,
    RemovePendingJobsAction,
    RetrieveJobsAction,
    SelectJobFilterAction,
    SetAddMetadataJobsAction,
    SetCopyJobsAction,
    SetUploadJobsAction,
    StopJobPollAction,
    UpdateIncompleteJobNamesAction,
} from "./types";

export const initialState: JobStateBranch = {
    addMetadataJobs: [],
    copyJobs: [],
    incompleteJobNames: [],
    jobFilter: JobFilter.Pending,
    pendingJobs: [],
    polling: false,
    uploadJobs: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [SET_UPLOAD_JOBS]: {
        accepts: (action: AnyAction): action is SetUploadJobsAction => action.type === SET_UPLOAD_JOBS,
        perform: (state: JobStateBranch, action: SetUploadJobsAction) => {
            const uploadJobs = action.payload;
            return {
                ...state,
                uploadJobs,
            };
        },
    },
    [SET_COPY_JOBS]: {
        accepts: (action: AnyAction): action is SetCopyJobsAction => action.type === SET_COPY_JOBS,
        perform: (state: JobStateBranch, action: SetCopyJobsAction) => {
            const copyJobs = action.payload;
            return {
                ...state,
                copyJobs,
            };
        },
    },
    [SET_ADD_METADATA_JOBS]: {
        accepts: (action: AnyAction): action is SetAddMetadataJobsAction => action.type === SET_ADD_METADATA_JOBS,
        perform: (state: JobStateBranch, action: SetAddMetadataJobsAction) => {
            return {
                ...state,
                addMetadataJobs: action.payload,
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
    [RETRIEVE_JOBS]: {
        accepts: (action: AnyAction): action is RetrieveJobsAction => action.type === RETRIEVE_JOBS,
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
