import { AnyAction } from "redux";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { DECREMENT_PENDING_JOBS, INCREMENT_PENDING_JOBS, SET_COPY_JOBS, SET_UPLOAD_JOBS } from "./constants";
import {
    DecrementPendingJobsAction,
    IncrementPendingJobsAction,
    JobStateBranch,
    SetCopyJobsAction,
    SetUploadJobsAction,
} from "./types";

export const initialState = {
    copyJobs: [],
    pendingJobs: 0,
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
    [INCREMENT_PENDING_JOBS]: {
        accepts: (action: AnyAction): action is IncrementPendingJobsAction => action.type === INCREMENT_PENDING_JOBS,
        perform: (state: JobStateBranch) => {
            return {
                ...state,
                pendingJobs: state.pendingJobs++,
            };
        },
    },
    [DECREMENT_PENDING_JOBS]: {
        accepts: (action: AnyAction): action is DecrementPendingJobsAction => action.type === DECREMENT_PENDING_JOBS,
        perform: (state: JobStateBranch) => {
            return {
                ...state,
                pendingJobs: Math.max(state.pendingJobs--, 0),
            };
        },
    },
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);
