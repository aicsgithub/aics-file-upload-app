import { SettingStateBranch } from "../types";

import {
  GATHER_SETTINGS,
  OPEN_ENVIRONMENT_DIALOG,
  SET_MOUNT_POINT,
  UPDATE_SETTINGS,
} from "./constants";
import {
  GatherSettingsAction,
  SetMountPointAction,
  OpenEnvironmentDialogAction,
  UpdateSettingsAction,
} from "./types";

export function updateSettings(
  payload: Partial<SettingStateBranch>
): UpdateSettingsAction {
  return {
    payload,
    type: UPDATE_SETTINGS,
  };
}

export function gatherSettings(): GatherSettingsAction {
  return {
    payload: {}, // this gets populated in logics
    type: GATHER_SETTINGS,
  };
}

export function setMountPoint(): SetMountPointAction {
  return {
    type: SET_MOUNT_POINT,
  };
}

export function openEnvironmentDialog(): OpenEnvironmentDialogAction {
  return {
    type: OPEN_ENVIRONMENT_DIALOG,
  };
}
