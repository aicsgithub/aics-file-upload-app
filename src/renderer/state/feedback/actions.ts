import { AnyAction } from "redux";

import { AlertType, AppAlert, AsyncRequest, ModalName } from "../types";

import {
  ADD_EVENT,
  ADD_REQUEST_IN_PROGRESS,
  CLEAR_ALERT,
  CLEAR_DEFERRED_ACTION,
  CLEAR_UPLOAD_ERROR,
  CLOSE_MODAL,
  CLOSE_SET_MOUNT_POINT_NOTIFICATION,
  OPEN_MODAL,
  OPEN_SET_MOUNT_POINT_NOTIFICATION,
  REMOVE_REQUEST_IN_PROGRESS,
  SET_ALERT,
  SET_DEFERRED_ACTION,
  START_LOADING,
  STOP_LOADING,
  TOGGLE_FOLDER_TREE,
} from "./constants";
import {
  AddEventAction,
  AddRequestInProgressAction,
  ClearAlertAction,
  ClearDeferredAction,
  ClearUploadErrorAction,
  CloseModalAction,
  CloseSetMountPointNotificationAction,
  OpenModalAction,
  OpenSetMountPointNotificationAction,
  RemoveRequestInProgressAction,
  SetAlertAction,
  SetDeferredActionAction,
  StartLoadingAction,
  StopLoadingAction,
  ToggleFolderTreeAction,
} from "./types";

export function setAlert(payload: AppAlert): SetAlertAction {
  return {
    payload,
    type: SET_ALERT,
  };
}

export function clearAlert(): ClearAlertAction {
  return {
    type: CLEAR_ALERT,
  };
}

export function setErrorAlert(message: string): SetAlertAction {
  return {
    payload: {
      message,
      type: AlertType.ERROR,
    },
    type: SET_ALERT,
  };
}

export function setWarningAlert(message: string): SetAlertAction {
  return {
    payload: {
      message,
      type: AlertType.WARN,
    },
    type: SET_ALERT,
  };
}

export function setSuccessAlert(message: string): SetAlertAction {
  return {
    payload: {
      message,
      type: AlertType.SUCCESS,
    },
    type: SET_ALERT,
  };
}

export function startLoading(): StartLoadingAction {
  return {
    type: START_LOADING,
  };
}
export function stopLoading(): StopLoadingAction {
  return {
    type: STOP_LOADING,
  };
}

export function addRequestToInProgress(
  payload: AsyncRequest
): AddRequestInProgressAction {
  return {
    payload,
    type: ADD_REQUEST_IN_PROGRESS,
  };
}

export function removeRequestFromInProgress(
  payload: AsyncRequest | string
): RemoveRequestInProgressAction {
  return {
    payload,
    type: REMOVE_REQUEST_IN_PROGRESS,
  };
}

export function addEvent(
  message: string,
  type: AlertType,
  date: Date
): AddEventAction {
  return {
    payload: {
      date,
      message,
      type,
    },
    type: ADD_EVENT,
  };
}

export function openSetMountPointNotification(): OpenSetMountPointNotificationAction {
  return {
    type: OPEN_SET_MOUNT_POINT_NOTIFICATION,
  };
}

export function closeSetMountPointNotification(): CloseSetMountPointNotificationAction {
  return {
    type: CLOSE_SET_MOUNT_POINT_NOTIFICATION,
  };
}

export function openModal(modalName: ModalName): OpenModalAction {
  return {
    payload: modalName,
    type: OPEN_MODAL,
  };
}

export function closeModal(modalName: ModalName): CloseModalAction {
  return {
    payload: modalName,
    type: CLOSE_MODAL,
  };
}

export function setDeferredAction(action: AnyAction): SetDeferredActionAction {
  return {
    payload: action,
    type: SET_DEFERRED_ACTION,
  };
}

export function clearDeferredAction(): ClearDeferredAction {
  return {
    type: CLEAR_DEFERRED_ACTION,
  };
}

export function clearUploadError(): ClearUploadErrorAction {
  return {
    type: CLEAR_UPLOAD_ERROR,
  };
}

export function toggleFolderTree(): ToggleFolderTreeAction {
  return {
    type: TOGGLE_FOLDER_TREE,
  };
}
