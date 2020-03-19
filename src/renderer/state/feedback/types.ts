import { AnyAction } from "redux";

export interface FeedbackStateBranch {
    alert?: AppAlert;
    deferredActions: AnyAction[]; // actions to dispatch when modal closes
    events: AppEvent[];
    isLoading: boolean;
    requestsInProgress: AsyncRequest[];
    setMountPointNotificationVisible: boolean;
    visibleModals: ModalName[];
}

export type ModalName = "openTemplate" | "openUpload" | "saveUploadDraft" | "settings" | "templateEditor";

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
    EXPORT_FILE_METADATA = "EXPORT_FILE_METADATA",
    GET_ANNOTATIONS = "GET_ANNOTATIONS",
    GET_BARCODE_SEARCH_RESULTS = "GET_BARCODE_SEARCH_RESULTS",
    GET_PLATE = "GET_PLATE",
    GET_JOBS = "GET_JOBS",
    GET_OPTIONS_FOR_LOOKUP = "GET_OPTIONS_FOR_LOOKUP",
    GET_TEMPLATE = "GET_TEMPLATE", // full template with annotations from MMS
    GET_TEMPLATES = "GET_TEMPLATES", // just template name from Labkey
    REQUEST_METADATA = "REQUEST_METADATA",
    REQUEST_FILE_METADATA_FOR_JOB = "REQUEST_FILE_METADATA_FOR_JOB",
    RETRY_UPLOAD = "RETRY_UPLOAD",
    SAVE_TEMPLATE = "SAVE_TEMPLATE",
    SEARCH_FILE_METADATA = "SEARCH_FILE_METADATA",
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

export interface OpenModalAction {
    payload: ModalName;
    type: string;
}

export interface CloseModalAction {
    payload: ModalName;
    type: string;
}

export interface OpenTemplateEditorAction {
    payload?: number;
    type: string;
}

export interface SetDeferredActionsAction {
    payload: AnyAction[];
    type: string;
}

export interface ClearDeferredAction {
    type: string;
}
