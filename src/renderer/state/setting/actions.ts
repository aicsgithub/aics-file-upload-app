import { SWITCH_ENVIRONMENT } from "../../../shared/constants";

import {
    ASSOCIATE_BY_WORKFLOW,
    GATHER_SETTINGS,
    SET_MOUNT_POINT,
    UPDATE_SETTINGS,
} from "./constants";
import {
    AssociateByWorkflowAction,
    GatherSettingsAction,
    SetMountPointAction,
    SettingStateBranch,
    SwitchEnvironmentAction,
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

export function setTemplateIdSetting(templateId: number): UpdateSettingsAction {
    return {
        payload: {
            templateId,
        },
        type: UPDATE_SETTINGS,
    };
}

export function setMetadataColumnsSetting(metadataColumns: string[]): UpdateSettingsAction {
    return {
        payload: {
            metadataColumns,
        },
        type: UPDATE_SETTINGS,
    };
}
