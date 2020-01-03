import { filter, includes, uniqBy } from "lodash";
import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    ADD_PENDING_JOB,
    REMOVE_PENDING_JOB,
    SELECT_JOB_FILTER,
    SET_ADD_METADATA_JOBS,
    SET_COPY_JOBS,
    SET_UPLOAD_JOBS,
    UPDATE_INCOMPLETE_JOBS
} from "./constants";
import {
    AddPendingJobAction,
    JobFilter,
    JobStateBranch,
    RemovePendingJobsAction,
    SelectJobFilterAction,
    SetAddMetadataJobsAction,
    SetCopyJobsAction,
    SetUploadJobsAction,
    UpdateIncompleteJobsAction,
} from "./types";

export const initialState = {
    addMetadataJobs: [],
    copyJobs: [],
    incompleteJobs: [],
    jobFilter: JobFilter.Pending,
    pendingJobs: [],
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
    [UPDATE_INCOMPLETE_JOBS]: {
        accepts: (action: AnyAction): action is UpdateIncompleteJobsAction => action.type === UPDATE_INCOMPLETE_JOBS,
        perform: (state: JobStateBranch, action: UpdateIncompleteJobsAction) => {
            return {
                ...state,
                incompleteJobs: action.payload,
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
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);
