import { AnyAction } from "redux";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { SET_UPLOAD_JOBS } from "./constants";
import { JobStateBranch, SetUploadJobsAction } from "./types";

export const initialState = {
    copyJobs: [],
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
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);
