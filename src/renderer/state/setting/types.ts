import { LimsUrl } from "../../../shared/types";

export interface SettingStateBranch extends LimsUrl {
    associateByWorkflow: boolean;
    mountPoint?: string;
    templateIds: number[];
}

export interface AddTemplateIdToSettingsAction {
    payload: number;
    type: string;
}
export interface AssociateByWorkflowAction {
    payload: boolean;
    type: string;
}

export interface UpdateSettingsAction {
    payload: Partial<SettingStateBranch>;
    type: string;
}

export interface GatherSettingsAction {
    type: string;
}

export interface SetMountPointAction {
    type: string;
}

export interface SwitchEnvironmentAction {
    type: string;
}
