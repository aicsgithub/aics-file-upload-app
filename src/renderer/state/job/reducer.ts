import { AnyAction } from "redux";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { SET_JOBS } from "./constants";
import { JobStateBranch, SetJobsAction } from "./types";

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
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);
