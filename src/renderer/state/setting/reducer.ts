import { userInfo } from "os";
import { AnyAction } from "redux";

import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../../shared/constants";
import { SET_PLATE } from "../selection/constants";
import { SetPlateAction } from "../selection/types";
import { TypeToDescriptionMap } from "../types";
import { APPLY_TEMPLATE, REPLACE_UPLOAD } from "../upload/constants";
import { ApplyTemplateAction, ReplaceUploadAction } from "../upload/types";
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
    showUploadHint: true,
    username: userInfo().username,
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
    [APPLY_TEMPLATE]: {
        accepts: (action: AnyAction): action is ApplyTemplateAction =>
            action.type === APPLY_TEMPLATE,
        perform: (state: SettingStateBranch, action: ApplyTemplateAction) => ({
            ...state,
            templateId: action.payload,
        }),
    },
    [SET_PLATE]: {
        accepts: (action: AnyAction): action is SetPlateAction =>
            action.type === SET_PLATE,
        perform: (state: SettingStateBranch) => ({
            ...state,
            associateByWorkflow: false,
        }),
    },
};

export default makeReducer<SettingStateBranch>(actionToConfigMap, initialState);
