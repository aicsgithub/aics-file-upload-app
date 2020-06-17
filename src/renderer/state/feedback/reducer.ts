import { uniq, without } from "lodash";
import { AnyAction } from "redux";

import { OPEN_TEMPLATE_MENU_ITEM_CLICKED } from "../../../shared/constants";
import { RECEIVE_JOBS, RETRIEVE_JOBS } from "../job/constants";
import { ReceiveJobsAction, RetrieveJobsAction } from "../job/types";
import {
  RECEIVE_FILE_METADATA,
  REQUEST_FILE_METADATA_FOR_JOB,
} from "../metadata/constants";
import {
  ReceiveFileMetadataAction,
  RequestFileMetadataForJobAction,
} from "../metadata/types";
import { CLOSE_UPLOAD_TAB, SELECT_PAGE } from "../route/constants";
import { CloseUploadTabAction, Page, SelectPageAction } from "../route/types";
import { SELECT_BARCODE, SET_PLATE } from "../selection/constants";
import {
  SelectBarcodeAction,
  SelectionStateBranch,
  SetPlateAction,
} from "../selection/types";
import { SAVE_TEMPLATE, SET_APPLIED_TEMPLATE } from "../template/constants";
import {
  SaveTemplateAction,
  SetAppliedTemplateAction,
} from "../template/types";
import { HTTP_STATUS, TypeToDescriptionMap } from "../types";
import {
  APPLY_TEMPLATE,
  CANCEL_UPLOAD,
  CANCEL_UPLOAD_FAILED,
  CANCEL_UPLOAD_SUCCEEDED,
  INITIATE_UPLOAD,
  RETRY_UPLOAD,
  RETRY_UPLOAD_FAILED,
  RETRY_UPLOAD_SUCCEEDED,
} from "../upload/constants";
import {
  ApplyTemplateAction,
  CancelUploadAction,
  CancelUploadFailedAction,
  CancelUploadSucceededAction,
  InitiateUploadAction,
  RetryUploadAction,
  RetryUploadFailedAction,
  RetryUploadSucceededAction,
} from "../upload/types";
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
  TOGGLE_FOLDER_TREE,
} from "./constants";
import {
  AddEventAction,
  AddRequestInProgressAction,
  AlertType,
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
  ToggleFolderTreeAction,
} from "./types";

const BAD_GATEWAY_ERROR = "Bad Gateway Error: Labkey or MMS is down.";
const addRequestToInProgress = (state: FeedbackStateBranch, request: string) =>
  uniq([...state.requestsInProgress, request]);
const removeRequestFromInProgress = (
  state: FeedbackStateBranch,
  request: string
) => without(state.requestsInProgress, request);
const getInfoAlert = (message: string) => ({
  message,
  type: AlertType.INFO,
});
const getSuccessAlert = (message: string) => ({
  message,
  type: AlertType.SUCCESS,
});
const getErrorAlert = (message: string) => ({
  message,
  type: AlertType.ERROR,
});

export const initialState: FeedbackStateBranch = {
  deferredAction: undefined,
  events: [],
  folderTreeOpen: false,
  isLoading: false,
  requestsInProgress: [],
  setMountPointNotificationVisible: false,
  uploadError: undefined,
  visibleModals: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
  [CLEAR_ALERT]: {
    accepts: (action: AnyAction): action is ClearAlertAction =>
      action.type === CLEAR_ALERT,
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
    accepts: (action: AnyAction): action is SetAlertAction =>
      action.type === SET_ALERT,
    perform: (state: FeedbackStateBranch, { payload }: SetAlertAction) => {
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
    accepts: (action: AnyAction): action is StartLoadingAction =>
      action.type === START_LOADING,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      isLoading: true,
    }),
  },
  [STOP_LOADING]: {
    accepts: (action: AnyAction): action is StopLoadingAction =>
      action.type === STOP_LOADING,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      isLoading: false,
    }),
  },
  [ADD_REQUEST_IN_PROGRESS]: {
    accepts: (action: AnyAction): action is AddRequestInProgressAction =>
      action.type === ADD_REQUEST_IN_PROGRESS,
    perform: (
      state: FeedbackStateBranch,
      action: AddRequestInProgressAction
    ) => {
      return {
        ...state,
        requestsInProgress: addRequestToInProgress(state, action.payload),
      };
    },
  },
  [REMOVE_REQUEST_IN_PROGRESS]: {
    accepts: (action: AnyAction): action is RemoveRequestInProgressAction =>
      action.type === REMOVE_REQUEST_IN_PROGRESS,
    perform: (
      state: FeedbackStateBranch,
      action: RemoveRequestInProgressAction
    ) => {
      return {
        ...state,
        requestsInProgress: removeRequestFromInProgress(state, action.payload),
      };
    },
  },
  [ADD_EVENT]: {
    accepts: (action: AnyAction): action is AddEventAction =>
      action.type === ADD_EVENT,
    perform: (state: FeedbackStateBranch, action: AddEventAction) => {
      return {
        ...state,
        events: [...state.events, action.payload],
      };
    },
  },
  [OPEN_SET_MOUNT_POINT_NOTIFICATION]: {
    accepts: (
      action: AnyAction
    ): action is OpenSetMountPointNotificationAction =>
      action.type === OPEN_SET_MOUNT_POINT_NOTIFICATION,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      setMountPointNotificationVisible: true,
    }),
  },
  [CLOSE_SET_MOUNT_POINT_NOTIFICATION]: {
    accepts: (
      action: AnyAction
    ): action is CloseSetMountPointNotificationAction =>
      action.type === CLOSE_SET_MOUNT_POINT_NOTIFICATION,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      setMountPointNotificationVisible: false,
    }),
  },
  [OPEN_MODAL]: {
    accepts: (action: AnyAction): action is OpenModalAction =>
      action.type === OPEN_MODAL,
    perform: (state: FeedbackStateBranch, action: OpenModalAction) => ({
      ...state,
      visibleModals: uniq([...state.visibleModals, action.payload]),
    }),
  },
  [CLOSE_MODAL]: {
    accepts: (action: AnyAction): action is CloseModalAction =>
      action.type === CLOSE_MODAL,
    perform: (state: FeedbackStateBranch, action: CloseModalAction) => ({
      ...state,
      visibleModals: without(state.visibleModals, action.payload),
    }),
  },
  [OPEN_TEMPLATE_MENU_ITEM_CLICKED]: {
    accepts: (action: AnyAction): action is OpenTemplateEditorAction =>
      action.type === OPEN_TEMPLATE_MENU_ITEM_CLICKED,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      visibleModals: uniq([...state.visibleModals, "templateEditor"]),
    }),
  },
  [SET_DEFERRED_ACTION]: {
    accepts: (action: AnyAction): action is SetDeferredActionAction =>
      action.type === SET_DEFERRED_ACTION,
    perform: (state: FeedbackStateBranch, action: SetDeferredActionAction) => ({
      ...state,
      deferredAction: action.payload,
    }),
  },
  [CLEAR_DEFERRED_ACTION]: {
    accepts: (action: AnyAction): action is ClearDeferredAction =>
      action.type === CLEAR_DEFERRED_ACTION,
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
      folderTreeOpen: false,
      setMountPointNotificationVisible: false,
      uploadError: undefined,
    }),
  },
  [SET_UPLOAD_ERROR]: {
    accepts: (action: AnyAction): action is SetUploadErrorAction =>
      action.type === SET_UPLOAD_ERROR,
    perform: (
      state: FeedbackStateBranch,
      { payload: { error, jobName } }: SetUploadErrorAction
    ) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        `${AsyncRequest.INITIATE_UPLOAD}-${jobName}`
      ),
      uploadError: error,
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
      requestsInProgress: addRequestToInProgress(state, AsyncRequest.GET_PLATE),
    }),
  },
  [SET_PLATE]: {
    accepts: (action: AnyAction): action is SetPlateAction =>
      action.type === SET_PLATE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.GET_PLATE
      ),
    }),
  },
  [REQUEST_FILE_METADATA_FOR_JOB]: {
    accepts: (action: AnyAction): action is RequestFileMetadataForJobAction =>
      action.type === REQUEST_FILE_METADATA_FOR_JOB,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
      ),
    }),
  },
  [RECEIVE_FILE_METADATA]: {
    accepts: (action: AnyAction): action is ReceiveFileMetadataAction =>
      action.type === RECEIVE_FILE_METADATA,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
      ),
    }),
  },
  [APPLY_TEMPLATE]: {
    accepts: (action: AnyAction): action is ApplyTemplateAction =>
      action.type === APPLY_TEMPLATE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.GET_TEMPLATE
      ),
    }),
  },
  [SET_APPLIED_TEMPLATE]: {
    accepts: (action: AnyAction): action is SetAppliedTemplateAction =>
      action.type === SET_APPLIED_TEMPLATE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.GET_TEMPLATE
      ),
    }),
  },
  [SAVE_TEMPLATE]: {
    accepts: (action: AnyAction): action is SaveTemplateAction =>
      action.type === SAVE_TEMPLATE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.SAVE_TEMPLATE
      ),
    }),
  },
  [RETRIEVE_JOBS]: {
    accepts: (action: AnyAction): action is RetrieveJobsAction =>
      action.type === RETRIEVE_JOBS,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(state, AsyncRequest.GET_JOBS),
    }),
  },
  [RECEIVE_JOBS]: {
    accepts: (action: AnyAction): action is ReceiveJobsAction =>
      action.type === RECEIVE_JOBS,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.GET_JOBS
      ),
    }),
  },
  [INITIATE_UPLOAD]: {
    accepts: (action: AnyAction): action is InitiateUploadAction =>
      action.type === INITIATE_UPLOAD,
    perform: (
      state: FeedbackStateBranch,
      { payload: { jobName } }: InitiateUploadAction
    ) => ({
      ...state,
      alert: getInfoAlert("Starting upload"),
      requestsInProgress: addRequestToInProgress(
        state,
        `${AsyncRequest.INITIATE_UPLOAD}-${jobName}`
      ),
    }),
  },
  [RETRY_UPLOAD]: {
    accepts: (action: AnyAction): action is RetryUploadAction =>
      action.type === RETRY_UPLOAD,
    perform: (
      state: FeedbackStateBranch,
      { payload: { jobName } }: RetryUploadAction
    ) => ({
      ...state,
      alert: getInfoAlert(`Retrying upload ${jobName}`),
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.RETRY_UPLOAD
      ),
    }),
  },
  [RETRY_UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is RetryUploadSucceededAction =>
      action.type === RETRY_UPLOAD_SUCCEEDED,
    perform: (
      state: FeedbackStateBranch,
      { payload }: RetryUploadSucceededAction
    ) => ({
      ...state,
      alert: getSuccessAlert(`Retry upload ${payload.jobName} succeeded!`),
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.RETRY_UPLOAD
      ),
    }),
  },
  [RETRY_UPLOAD_FAILED]: {
    accepts: (action: AnyAction): action is RetryUploadFailedAction =>
      action.type === RETRY_UPLOAD_FAILED,
    perform: (
      state: FeedbackStateBranch,
      { payload: { error } }: RetryUploadFailedAction
    ) => ({
      ...state,
      alert: getErrorAlert(error),
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.RETRY_UPLOAD
      ),
    }),
  },
  [CANCEL_UPLOAD]: {
    accepts: (action: AnyAction): action is CancelUploadAction =>
      action.type === CANCEL_UPLOAD,
    perform: (
      state: FeedbackStateBranch,
      { payload: { jobName } }: CancelUploadAction
    ) => ({
      ...state,
      alert: getInfoAlert(`Cancelling upload ${jobName}`),
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.CANCEL_UPLOAD
      ),
    }),
  },
  [CANCEL_UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is CancelUploadSucceededAction =>
      action.type === CANCEL_UPLOAD_SUCCEEDED,
    perform: (
      state: FeedbackStateBranch,
      { payload: { jobName } }: CancelUploadSucceededAction
    ) => ({
      ...state,
      alert: getSuccessAlert(`Cancel upload ${jobName} succeeded`),
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.CANCEL_UPLOAD
      ),
    }),
  },
  [CANCEL_UPLOAD_FAILED]: {
    accepts: (action: AnyAction): action is CancelUploadFailedAction =>
      action.type === CANCEL_UPLOAD_FAILED,
    perform: (
      state: FeedbackStateBranch,
      { payload: { error } }: CancelUploadFailedAction
    ) => ({
      ...state,
      alert: getErrorAlert(error),
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.CANCEL_UPLOAD
      ),
    }),
  },
  [TOGGLE_FOLDER_TREE]: {
    accepts: (action: AnyAction): action is ToggleFolderTreeAction =>
      action.type === TOGGLE_FOLDER_TREE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      folderTreeOpen: !state.folderTreeOpen,
    }),
  },
  [SELECT_PAGE]: {
    accepts: (action: AnyAction): action is SelectPageAction =>
      action.type === SELECT_PAGE,
    perform: (
      state: SelectionStateBranch,
      { payload: { nextPage } }: SelectPageAction
    ) => {
      const pagesToShowFolderTree = [
        Page.AssociateFiles,
        Page.SelectStorageLocation,
      ];
      return {
        ...state,
        folderTreeOpen: pagesToShowFolderTree.includes(nextPage),
      };
    },
  },
};

export default makeReducer<FeedbackStateBranch>(
  actionToConfigMap,
  initialState
);
