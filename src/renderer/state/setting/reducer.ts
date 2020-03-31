import { AnyAction } from "redux";

import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../../shared/constants";
import { TypeToDescriptionMap } from "../types";
import { REPLACE_UPLOAD } from "../upload/constants";
import { ReplaceUploadAction } from "../upload/types";
import { makeReducer } from "../util";
import {
    ASSOCIATE_BY_WORKFLOW,
    GATHER_SETTINGS,
    UPDATE_SETTINGS,
} from "./constants";
import { getAssociateByWorkflow } from "./selectors";
import {
    AssociateByWorkflowAction,
    GatherSettingsAction,
    SettingStateBranch,
    UpdateSettingsAction,
} from "./types";

export const initialState: SettingStateBranch = {
    associateByWorkflow: false,
    limsHost: LIMS_HOST,
    limsPort: LIMS_PORT,
    limsProtocol: LIMS_PROTOCOL,
    metadataColumns: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [GATHER_SETTINGS]: {
        accepts: (action: AnyAction): action is GatherSettingsAction => action.type === GATHER_SETTINGS,
        perform: (state: SettingStateBranch, action: GatherSettingsAction) => ({ ...state, ...action.payload }),
    },
    [UPDATE_SETTINGS]: {
        accepts: (action: AnyAction): action is UpdateSettingsAction => action.type === UPDATE_SETTINGS,
        perform: (state: SettingStateBranch, action: UpdateSettingsAction) => ({ ...state, ...action.payload }),
    },
    [ASSOCIATE_BY_WORKFLOW]: {
        accepts: (action: AnyAction): action is AssociateByWorkflowAction => action.type === ASSOCIATE_BY_WORKFLOW,
        perform: (state: SettingStateBranch, action: AssociateByWorkflowAction) =>
            ({ ...state, associateByWorkflow: action.payload }),
    },
    [REPLACE_UPLOAD]: {
        accepts: (action: AnyAction): action is ReplaceUploadAction =>
            action.type === REPLACE_UPLOAD,
        perform: (state: SettingStateBranch, { payload: { state: savedState } }: ReplaceUploadAction) => ({
            ...state,
            associateByWorkflow: getAssociateByWorkflow(savedState),
        }),
    },
};

export default makeReducer<SettingStateBranch>(actionToConfigMap, initialState);
