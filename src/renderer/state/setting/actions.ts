import { GATHER_SETTINGS, SAVE_SCHEMA, UPDATE_SETTINGS } from "./constants";
import {
    CreateSchemaAction,
    GatherSettingsAction,
    SchemaDefinition,
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

export function saveSchema(schema: SchemaDefinition): CreateSchemaAction {
    return {
        payload: schema,
        type: SAVE_SCHEMA,
    };
}
