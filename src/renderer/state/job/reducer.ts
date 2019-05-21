import { AnyAction } from "redux";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { SET_UPLOAD_STATUS } from "./constants";
import { JobStateBranch, SetUploadStatusAction } from "./types";

export const initialState = {
    uploadStatus: "Not Started",
};

const actionToConfigMap: TypeToDescriptionMap = {
    [SET_UPLOAD_STATUS]: {
        accepts: (action: AnyAction): action is SetUploadStatusAction => action.type === SET_UPLOAD_STATUS,
        perform: (state: JobStateBranch, action: SetUploadStatusAction) => {
            return {
                ...state,
                uploadStatus: action.payload,
            };
        },
    },
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);
