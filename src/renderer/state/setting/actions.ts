import { GATHER_SETTINGS, UPDATE_SETTINGS } from "./constants";
import {
    GatherSettingsAction,
    SettingStateBranch,
    UpdateSettingsAction,
} from "./types";

export function updateSettings(payload: Partial<SettingStateBranch>): UpdateSettingsAction {
    return {
        payload,
        type: UPDATE_SETTINGS,
    };
}

export function gatherSettings(): GatherSettingsAction {
    return {
        type: GATHER_SETTINGS,
    };
}
