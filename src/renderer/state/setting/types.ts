import { SettingStateBranch } from "../types";

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
