import { CREATE_SCHEMA, GATHER_SETTINGS, UPDATE_SETTINGS } from "./constants";
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

export function createSchema(schema: SchemaDefinition): CreateSchemaAction {
    return {
        payload: schema,
        type: CREATE_SCHEMA,
    };
}
