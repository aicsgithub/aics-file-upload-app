export interface FeedbackStateBranch {
    alert?: AppAlert;
    events: AppEvent[];
    isLoading: boolean;
    requestsInProgress: AsyncRequest[];
    setMountPointNotificationVisible: boolean;
}

export interface StartLoadingAction {
    type: string;
}

export interface StopLoadingAction {
    type: string;
}

export interface AppAlert {
    manualClear?: boolean;
    message?: string;
    statusCode?: number;
    type: AlertType;
}

export interface AppEvent {
    message: string;
    date: Date;
    type: AlertType;
}

export enum AlertType {
    WARN = 1,
    SUCCESS,
    ERROR,
    INFO,
}

export interface SetAlertAction {
    payload: AppAlert;
    type: string;
}

export interface ClearAlertAction {
    type: string;
}

export enum AsyncRequest {
    CANCEL_UPLOAD = "CANCEL_UPLOAD",
    GET_ANNOTATIONS = "GET_ANNOTATIONS",
    GET_BARCODE_SEARCH_RESULTS = "GET_BARCODE_SEARCH_RESULTS",
    GET_PLATE = "GET_PLATE",
    GET_JOBS = "GET_JOBS",
    GET_TEMPLATE = "GET_TEMPLATE", // full template with annotations from MMS
    GET_TEMPLATES = "GET_TEMPLATES", // just template name from Labkey
    RETRY_UPLOAD = "RETRY_UPLOAD",
    SAVE_TEMPLATE = "SAVE_TEMPLATE",
}

export interface AddRequestInProgressAction {
    type: string;
    payload: AsyncRequest;
}

export interface RemoveRequestInProgressAction {
    type: string;
    payload: AsyncRequest;
}

export interface OpenSetMountPointNotificationAction {
    type: string;
}

export interface CloseSetMountPointNotificationAction {
    type: string;
}

export interface AddEventAction {
    type: string;
    payload: {
        date: Date;
        message: string;
        type: AlertType;
    };
}
