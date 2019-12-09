import { SWITCH_ENVIRONMENT } from "../../../shared/constants";

import {
    ADD_TEMPLATE_ID_TO_SETTINGS,
    ASSOCIATE_BY_WORKFLOW,
    GATHER_SETTINGS,
    SET_METADATA_COLUMNS,
    SET_MOUNT_POINT,
    UPDATE_SETTINGS,
} from "./constants";
import {
    AddTemplateIdToSettingsAction,
    AssociateByWorkflowAction,
    GatherSettingsAction,
    SetMetadataColumnsAction,
    SetMountPointAction,
    SettingStateBranch,
    SwitchEnvironmentAction,
    UpdateSettingsAction,
} from "./types";

export function addTemplateIdToSettings(payload: number): AddTemplateIdToSettingsAction {
    return {
        payload,
        type: ADD_TEMPLATE_ID_TO_SETTINGS,
    };
}

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

export function associateByWorkflow(shouldAssociateByWorkflow: boolean): AssociateByWorkflowAction {
    return {
        payload: shouldAssociateByWorkflow,
        type: ASSOCIATE_BY_WORKFLOW,
    };
}

export function setMountPoint(): SetMountPointAction {
    return {
        type: SET_MOUNT_POINT,
    };
}

export function switchEnvironment(): SwitchEnvironmentAction {
    return {
        type: SWITCH_ENVIRONMENT,
    };
}

export function setMetadataColumns(extraMetadataColumns: string[]): SetMetadataColumnsAction {
    return {
        payload: extraMetadataColumns,
        type: SET_METADATA_COLUMNS,
    };
}
