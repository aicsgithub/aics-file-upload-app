import { AnyAction } from "redux";
import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../../shared/constants";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { UPDATE_SETTINGS } from "./constants";
import { SettingStateBranch, UpdateSettingsAction } from "./types";

const initialState = {
    limsHost: LIMS_HOST,
    limsPort: LIMS_PORT,
    limsProtocol: LIMS_PROTOCOL,
};

const actionToConfigMap: TypeToDescriptionMap = {
    [UPDATE_SETTINGS]: {
        accepts: (action: AnyAction): action is UpdateSettingsAction => action.type === UPDATE_SETTINGS,
        perform: (state: SettingStateBranch, action: UpdateSettingsAction) => ({ ...state, ...action.payload }),
    },
};

export default makeReducer<SettingStateBranch>(actionToConfigMap, initialState);
