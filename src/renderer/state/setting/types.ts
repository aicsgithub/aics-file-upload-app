import { LimsUrl } from "../../../shared/types";

export interface SettingStateBranch extends LimsUrl {
    associateByWorkflow: boolean;
    schemaFilepaths: string[];
}

export interface AddTemplateIdToSettingsAction {
    payload: string;
    type: string;
}
export interface AssociateByWorkflowAction {
    payload: boolean;
    type: string;
}

export interface RemoveSchemaFilepathAction {
    payload: string;
    type: string;
}

export interface UpdateSettingsAction {
    payload: Partial<SettingStateBranch>;
    type: string;
}

export interface GatherSettingsAction {
    type: string;
}
