import { AnyAction } from "redux";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { ADD_JOB, SET_CURRENT_JOB_ID, SET_JOBS } from "./constants";
import { AddJobAction, JobStateBranch, SetCurrentJobIdAction, SetJobsAction } from "./types";

export const initialState = {
    currentJobId: undefined,
    jobs: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [SET_JOBS]: {
        accepts: (action: AnyAction): action is SetJobsAction => action.type === SET_JOBS,
        perform: (state: JobStateBranch, action: SetJobsAction) => {
            const jobs = action.payload;
            return {
                ...state,
                jobs,
            };
        },
    },
    [SET_CURRENT_JOB_ID]: {
        accepts: (action: AnyAction): action is SetCurrentJobIdAction => action.type === SET_CURRENT_JOB_ID,
        perform: (state: JobStateBranch, action: SetCurrentJobIdAction) => {
            return {
                ...state,
                currentJobId: action.payload,
            };
        },
    },
    [ADD_JOB]: {
        accepts: (action: AnyAction): action is AddJobAction => action.type === ADD_JOB,
        perform: (state: JobStateBranch, action: AddJobAction) => {
            return {
                ...state,
                jobs: [...state.jobs, action.payload],
            };
        },
    },
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);
