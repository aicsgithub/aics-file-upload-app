import { AnyAction } from "redux";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { ADD_JOB, SET_CURRENT_JOB_NAME, SET_JOBS } from "./constants";
import { AddJobAction, JobStateBranch, SetCurrentJobNameAction, SetJobsAction } from "./types";

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
    [SET_CURRENT_JOB_NAME]: {
        accepts: (action: AnyAction): action is SetCurrentJobNameAction => action.type === SET_CURRENT_JOB_NAME,
        perform: (state: JobStateBranch, action: SetCurrentJobNameAction) => {
            return {
                ...state,
                currentJobName: action.payload,
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
