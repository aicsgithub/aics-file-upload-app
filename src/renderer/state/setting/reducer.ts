import { uniq } from "lodash";
import { AnyAction } from "redux";

import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../../shared/constants";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    ADD_TEMPLATE_ID_TO_SETTINGS,
    ASSOCIATE_BY_WORKFLOW,
    UPDATE_SETTINGS,
} from "./constants";
import {
    AddTemplateIdToSettingsAction,
    AssociateByWorkflowAction,
    SettingStateBranch,
    UpdateSettingsAction
} from "./types";

const initialState: SettingStateBranch = {
    associateByWorkflow: false,
    limsHost: LIMS_HOST,
    limsPort: LIMS_PORT,
    limsProtocol: LIMS_PROTOCOL,
    templateIds: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [ADD_TEMPLATE_ID_TO_SETTINGS]: {
        accepts: (action: AnyAction): action is AddTemplateIdToSettingsAction =>
            action.type === ADD_TEMPLATE_ID_TO_SETTINGS,
        perform: (state: SettingStateBranch, action: AddTemplateIdToSettingsAction) => ({
            ...state,
            templateIds: uniq([...state.templateIds, action.payload]),
        }),
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
};

export default makeReducer<SettingStateBranch>(actionToConfigMap, initialState);
