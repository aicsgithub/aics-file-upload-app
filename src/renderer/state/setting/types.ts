import { LimsUrl } from "../../../shared/types";

export interface SettingStateBranch extends LimsUrl {
  associateByWorkflow: boolean;
  metadataColumns: string[];
  mountPoint?: string;
  // if true show hints on how to use the grid to enter data
  showUploadHint: boolean;
  showTemplateHint: boolean;
  templateId?: number;
  username: string;
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
  payload: Partial<SettingStateBranch>;
  type: string;
}

export interface SetMountPointAction {
  type: string;
}

export interface SwitchEnvironmentAction {
  type: string;
}
