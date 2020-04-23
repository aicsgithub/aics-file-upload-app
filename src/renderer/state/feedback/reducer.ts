import { uniq, without } from "lodash";
import { AnyAction } from "redux";
import { OPEN_TEMPLATE_EDITOR } from "../../../shared/constants";
import { RECEIVE_FILE_METADATA, REQUEST_FILE_METADATA_FOR_JOB } from "../metadata/constants";
import { ReceiveFileMetadataAction, RequestFileMetadataForJobAction } from "../metadata/types";
import { CLOSE_UPLOAD_TAB } from "../route/constants";
import { CloseUploadTabAction } from "../route/types";
import { SELECT_BARCODE, SET_PLATE } from "../selection/constants";

import { SelectBarcodeAction, SelectionStateBranch, SetPlateAction } from "../selection/types";
import { clearTemplateDraft } from "../template/actions";
import { SAVE_TEMPLATE, SET_APPLIED_TEMPLATE } from "../template/constants";
import { SaveTemplateAction, SetAppliedTemplateAction } from "../template/types";
import {
    HTTP_STATUS,
    TypeToDescriptionMap,
} from "../types";
import { APPLY_TEMPLATE } from "../upload/constants";
import { ApplyTemplateAction } from "../upload/types";
import { makeReducer } from "../util";

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
    SET_UPLOAD_ERROR,
    START_LOADING,
    STOP_LOADING,
} from "./constants";
import {
    AddEventAction,
    AddRequestInProgressAction,
    AsyncRequest,
    ClearAlertAction,
    ClearDeferredAction,
    ClearUploadErrorAction,
    CloseModalAction,
    CloseSetMountPointNotificationAction,
    FeedbackStateBranch,
    OpenModalAction,
    OpenSetMountPointNotificationAction,
    OpenTemplateEditorAction,
    RemoveRequestInProgressAction,
    SetAlertAction,
    SetDeferredActionAction,
    SetUploadErrorAction,
    StartLoadingAction,
    StopLoadingAction,
} from "./types";

const BAD_GATEWAY_ERROR = "Bad Gateway Error: Labkey or MMS is down.";

export const initialState: FeedbackStateBranch = {
    deferredAction: undefined,
    events: [],
    isLoading: false,
    requestsInProgress: [],
    setMountPointNotificationVisible: false,
    uploadError: undefined,
    visibleModals: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [CLEAR_ALERT]: {
        accepts: (action: AnyAction): action is ClearAlertAction => action.type === CLEAR_ALERT,
        perform: (state: FeedbackStateBranch) => {
            const { alert } = state;
            if (!alert) {
                return state;
            }

            const { message, type } = alert;
            const event = {
                date: new Date(),
                message,
                type,
            };
            return {
                ...state,
                alert: undefined,
                events: [...state.events, event],
            };
        },
    },
    [SET_ALERT]: {
        accepts: (action: AnyAction): action is SetAlertAction => action.type === SET_ALERT,
        perform: (state: FeedbackStateBranch, {payload}: SetAlertAction) => {
            const updatedPayload = { ...payload };
            // nginx returns HTML rather than a helpful concise message so we're adding one here
            if (payload.statusCode === HTTP_STATUS.BAD_GATEWAY && !payload.message) {
                updatedPayload.message = BAD_GATEWAY_ERROR;
            }
            return {
                ...state,
                alert: updatedPayload,
            };
        },
    },
    [START_LOADING]: {
        accepts: (action: AnyAction): action is StartLoadingAction => action.type === START_LOADING,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            isLoading: true,
        }),
    },
    [STOP_LOADING]: {
        accepts: (action: AnyAction): action is StopLoadingAction => action.type === STOP_LOADING,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            isLoading: false,
        }),
    },
    [ADD_REQUEST_IN_PROGRESS]: {
        accepts: (action: AnyAction): action is AddRequestInProgressAction => action.type === ADD_REQUEST_IN_PROGRESS,
        perform: (state: FeedbackStateBranch, action: AddRequestInProgressAction) => {
            const requestsInProgress = uniq([...state.requestsInProgress, action.payload]);

            return {
                ...state,
                requestsInProgress,
            };
        },
    },
    [REMOVE_REQUEST_IN_PROGRESS]: {
        accepts: (action: AnyAction): action is RemoveRequestInProgressAction =>
            action.type === REMOVE_REQUEST_IN_PROGRESS,
        perform: (state: FeedbackStateBranch, action: RemoveRequestInProgressAction) => {
            const requestsInProgress = state.requestsInProgress.filter((req) => req !== action.payload);

            return {
                ...state,
                requestsInProgress,
            };
        },
    },
    [ADD_EVENT]: {
        accepts: (action: AnyAction): action is AddEventAction => action.type === ADD_EVENT,
        perform: (state: FeedbackStateBranch, action: AddEventAction) => {
            return {
                ...state,
                events: [...state.events, action.payload],
            };
        },
    },
    [OPEN_SET_MOUNT_POINT_NOTIFICATION]: {
        accepts: (action: AnyAction): action is OpenSetMountPointNotificationAction =>
            action.type === OPEN_SET_MOUNT_POINT_NOTIFICATION,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            setMountPointNotificationVisible: true,
        }),
    },
    [CLOSE_SET_MOUNT_POINT_NOTIFICATION]: {
        accepts: (action: AnyAction): action is CloseSetMountPointNotificationAction =>
            action.type === CLOSE_SET_MOUNT_POINT_NOTIFICATION,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            setMountPointNotificationVisible: false,
        }),
    },
    [OPEN_MODAL]: {
        accepts: (action: AnyAction): action is OpenModalAction => action.type === OPEN_MODAL,
        perform: (state: FeedbackStateBranch, action: OpenModalAction) => ({
            ...state,
            visibleModals: uniq([...state.visibleModals, action.payload]),
        }),
    },
    [CLOSE_MODAL]: {
        accepts: (action: AnyAction): action is CloseModalAction => action.type === CLOSE_MODAL,
        perform: (state: FeedbackStateBranch, action: CloseModalAction) => ({
            ...state,
            visibleModals: without(state.visibleModals, action.payload),
        }),
    },
    [OPEN_TEMPLATE_EDITOR]: {
        accepts: (action: AnyAction): action is OpenTemplateEditorAction => action.type === OPEN_TEMPLATE_EDITOR,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            deferredAction: clearTemplateDraft(),
            visibleModals: uniq([...state.visibleModals, "templateEditor"]),
        }),
    },
    [SET_DEFERRED_ACTION]: {
        accepts: (action: AnyAction): action is SetDeferredActionAction => action.type === SET_DEFERRED_ACTION,
        perform: (state: FeedbackStateBranch, action: SetDeferredActionAction) => ({
            ...state,
            deferredAction: action.payload,
        }),
    },
    [CLEAR_DEFERRED_ACTION]: {
        accepts: (action: AnyAction): action is ClearDeferredAction => action.type === CLEAR_DEFERRED_ACTION,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            deferredAction: undefined,
        }),
    },
    [CLOSE_UPLOAD_TAB]: {
        accepts: (action: AnyAction): action is CloseUploadTabAction =>
            action.type === CLOSE_UPLOAD_TAB,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            setMountPointNotificationVisible: false,
        }),
    },
    [SET_UPLOAD_ERROR]: {
        accepts: (action: AnyAction): action is SetUploadErrorAction =>
            action.type === SET_UPLOAD_ERROR,
        perform: (state: FeedbackStateBranch, action: SetUploadErrorAction) => ({
            ...state,
            uploadError: action.payload,
        }),
    },
    [CLEAR_UPLOAD_ERROR]: {
        accepts: (action: AnyAction): action is ClearUploadErrorAction =>
            action.type === CLEAR_UPLOAD_ERROR,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            uploadError: undefined,
        }),
    },
    [SELECT_BARCODE]: {
        accepts: (action: AnyAction): action is SelectBarcodeAction =>
            action.type === SELECT_BARCODE,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            requestsInProgress: uniq([...state.requestsInProgress, AsyncRequest.GET_PLATE]),
        }),
    },
    [SET_PLATE]: {
        accepts: (action: AnyAction): action is SetPlateAction => action.type === SET_PLATE,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            requestsInProgress: without(state.requestsInProgress, AsyncRequest.GET_PLATE),
        }),
    },
    [REQUEST_FILE_METADATA_FOR_JOB]: {
        accepts: (action: AnyAction): action is RequestFileMetadataForJobAction =>
            action.type === REQUEST_FILE_METADATA_FOR_JOB,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            requestsInProgress: uniq([...state.requestsInProgress, AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB]),
        }),
    },
    [RECEIVE_FILE_METADATA]: {
        accepts: (action: AnyAction): action is ReceiveFileMetadataAction =>
            action.type === RECEIVE_FILE_METADATA,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            requestsInProgress: without(state.requestsInProgress, AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB),
        }),
    },
    [APPLY_TEMPLATE]: {
        accepts: (action: AnyAction): action is ApplyTemplateAction =>
            action.type === APPLY_TEMPLATE,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            requestsInProgress: uniq([...state.requestsInProgress, AsyncRequest.GET_TEMPLATE]),
        }),
    },
    [SET_APPLIED_TEMPLATE]: {
        accepts: (action: AnyAction): action is SetAppliedTemplateAction => action.type === SET_APPLIED_TEMPLATE,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            requestsInProgress: without(state.requestsInProgress, AsyncRequest.GET_TEMPLATE),
        }),
    },
    [SAVE_TEMPLATE]: {
        accepts: (action: AnyAction): action is SaveTemplateAction =>
            action.type === SAVE_TEMPLATE,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            requestsInProgress: uniq([...state.requestsInProgress, AsyncRequest.SAVE_TEMPLATE]),
        }),
    },
};

export default makeReducer<FeedbackStateBranch>(actionToConfigMap, initialState);
