import { AnyAction } from "redux";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { ADD_JOB, SET_JOBS } from "./constants";
import { AddJobAction, JobStateBranch, SetJobsAction } from "./types";

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
