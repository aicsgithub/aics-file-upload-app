import { uniq, without } from "lodash";
import { AnyAction } from "redux";

import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../../shared/constants";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    ADD_SCHEMA_FILE_PATH,
    ASSOCIATE_BY_WORKFLOW,
    REMOVE_SCHEMA_FILE_PATH,
    UPDATE_SETTINGS,
} from "./constants";
import {
    AddSchemaFilepathAction,
    AssociateByWorkflowAction,
    RemoveSchemaFilepathAction,
    SettingStateBranch,
    UpdateSettingsAction
} from "./types";

const initialState: SettingStateBranch = {
    associateByWorkflow: false,
    limsHost: LIMS_HOST,
    limsPort: LIMS_PORT,
    limsProtocol: LIMS_PROTOCOL,
    schemaFilepaths: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [ADD_SCHEMA_FILE_PATH]: {
        accepts: (action: AnyAction): action is AddSchemaFilepathAction => action.type === ADD_SCHEMA_FILE_PATH,
        perform: (state: SettingStateBranch, action: AddSchemaFilepathAction) => ({
            ...state,
            schemaFilepaths: uniq([...state.schemaFilepaths, action.payload]),
        }),
    },
    [REMOVE_SCHEMA_FILE_PATH]: {
        accepts: (action: AnyAction): action is RemoveSchemaFilepathAction => action.type === REMOVE_SCHEMA_FILE_PATH,
        perform: (state: SettingStateBranch, action: RemoveSchemaFilepathAction) => ({
            ...state,
            schemaFilepaths: without(state.schemaFilepaths, action.payload),
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
