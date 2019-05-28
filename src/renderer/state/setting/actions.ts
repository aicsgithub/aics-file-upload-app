import { UPDATE_SETTINGS } from "./constants";
import { SettingStateBranch, UpdateSettingsAction } from "./types";

export function updateSettings(payload: Partial<SettingStateBranch>): UpdateSettingsAction {
    return {
        payload,
        type: UPDATE_SETTINGS,
    };
}
