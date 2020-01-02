import { AnyAction } from "redux";

import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../../shared/constants";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    ASSOCIATE_BY_WORKFLOW,
    UPDATE_SETTINGS,
} from "./constants";
import {
    AssociateByWorkflowAction,
    SettingStateBranch,
    UpdateSettingsAction
} from "./types";

export const initialState: SettingStateBranch = {
    associateByWorkflow: false,
    incompleteJobs: [],
    limsHost: LIMS_HOST,
    limsPort: LIMS_PORT,
    limsProtocol: LIMS_PROTOCOL,
    metadataColumns: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [UPDATE_SETTINGS]: {
        accepts: (action: AnyAction): action is UpdateSettingsAction => action.type === UPDATE_SETTINGS,
        perform: (state: SettingStateBranch, action: UpdateSettingsAction) => ({ ...state, ...action.payload }),
    },
    [ASSOCIATE_BY_WORKFLOW]: {
        accepts: (action: AnyAction): action is AssociateByWorkflowAction => action.type === ASSOCIATE_BY_WORKFLOW,
        perform: (state: SettingStateBranch, action: AssociateByWorkflowAction) =>
            ({ ...state, associateByWorkflow: action.payload }),
    },
};

export default makeReducer<SettingStateBranch>(actionToConfigMap, initialState);
