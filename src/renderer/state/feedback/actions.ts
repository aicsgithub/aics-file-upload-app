import {
    ADD_EVENT,
    ADD_REQUEST_IN_PROGRESS,
    CLEAR_ALERT,
    REMOVE_REQUEST_IN_PROGRESS,
    SET_ALERT,
    START_LOADING,
    STOP_LOADING
} from "./constants";

import {
    AddEventAction,
    AddRequestInProgressAction,
    AlertType,
    AppAlert,
    AsyncRequest,
    ClearAlertAction,
    RemoveRequestInProgressAction,
    SetAlertAction,
    StartLoadingAction,
    StopLoadingAction,
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

export function addRequestToInProgress(payload: AsyncRequest): AddRequestInProgressAction {
    return {
        payload,
        type: ADD_REQUEST_IN_PROGRESS,
    };
}

export function removeRequestFromInProgress(payload: AsyncRequest): RemoveRequestInProgressAction {
    return {
        payload,
        type: REMOVE_REQUEST_IN_PROGRESS,
    };
}

export function addEvent(message: string, type: AlertType, date: Date): AddEventAction {
    return {
        payload: {
            date,
            message,
            type,
        },
        type: ADD_EVENT,
    };
}
