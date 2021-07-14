import { AnyAction } from "redux";

import {
  VIEW_UPLOADS,
  VIEW_UPLOADS_SUCCEEDED,
  RESET_UPLOAD,
} from "../route/constants";
import {
  ViewUploadsAction,
  ViewUploadsSucceededAction,
  ResetUploadAction,
} from "../route/types";
import { MetadataStateBranch, TypeToDescriptionMap } from "../types";
import { REPLACE_UPLOAD, SAVE_UPLOAD_DRAFT_SUCCESS } from "../upload/constants";
import {
  ReplaceUploadAction,
  SaveUploadDraftSuccessAction,
} from "../upload/types";
import { makeReducer } from "../util";

import {
  CLEAR_FILE_METADATA_FOR_JOB,
  CLEAR_OPTIONS_FOR_LOOKUP,
  RECEIVE_ANNOTATION_USAGE,
  RECEIVE_METADATA,
  RESET_HISTORY,
  UPDATE_PAGE_HISTORY,
} from "./constants";
import {
  ClearFileMetadataForJobAction,
  ClearOptionsForLookupAction,
  ReceiveAnnotationUsageAction,
  ReceiveMetadataAction,
  ResetHistoryAction,
  UpdatePageHistoryMapAction,
} from "./types";

export const initialState: MetadataStateBranch = {
  annotationIdToHasBeenUsed: {},
  annotationLookups: [],
  annotationOptions: [],
  annotationTypes: [],
  annotations: [],
  barcodePrefixes: [],
  barcodeSearchResults: [],
  channels: [],
  history: {
    selection: {},
    upload: {},
  },
  imagingSessions: [],
  lookups: [],
  templates: [],
  units: [],
  users: [],
};

const actionToConfigMap: TypeToDescriptionMap<MetadataStateBranch> = {
  [CLEAR_OPTIONS_FOR_LOOKUP]: {
    accepts: (action: AnyAction): action is ClearOptionsForLookupAction =>
      action.type === CLEAR_OPTIONS_FOR_LOOKUP,
    perform: (
      state: MetadataStateBranch,
      action: ClearOptionsForLookupAction
    ) => ({ ...state, [action.payload]: [] }),
  },
  [RECEIVE_METADATA]: {
    accepts: (action: AnyAction): action is ReceiveMetadataAction =>
      action.type === RECEIVE_METADATA,
    perform: (
      state: MetadataStateBranch,
      { payload: { metadata } }: ReceiveMetadataAction
    ) => ({
      ...state,
      ...metadata,
    }),
  },
  [RECEIVE_ANNOTATION_USAGE]: {
    accepts: (action: AnyAction): action is ReceiveAnnotationUsageAction =>
      action.type === RECEIVE_ANNOTATION_USAGE,
    perform: (
      state: MetadataStateBranch,
      { payload }: ReceiveAnnotationUsageAction
    ) => ({
      ...state,
      annotationIdToHasBeenUsed: {
        ...state.annotationIdToHasBeenUsed,
        [payload.annotationId]: payload.hasAnnotationValues,
      },
    }),
  },
  [RESET_HISTORY]: {
    accepts: (action: AnyAction): action is ResetHistoryAction =>
      action.type === RESET_HISTORY,
    perform: (state: MetadataStateBranch) => ({
      ...state,
      history: {
        selection: {},
        upload: {},
      },
    }),
  },
  [UPDATE_PAGE_HISTORY]: {
    accepts: (action: AnyAction): action is UpdatePageHistoryMapAction =>
      action.type === UPDATE_PAGE_HISTORY,
    perform: (
      state: MetadataStateBranch,
      action: UpdatePageHistoryMapAction
    ) => ({
      ...state,
      history: {
        selection: {
          ...state.history.selection,
          ...action.payload.selection,
        },
        upload: {
          ...state.history.upload,
          ...action.payload.upload,
        },
      },
    }),
  },
  [CLEAR_FILE_METADATA_FOR_JOB]: {
    accepts: (action: AnyAction): action is ClearFileMetadataForJobAction =>
      action.type === CLEAR_FILE_METADATA_FOR_JOB,
    perform: (state: MetadataStateBranch) => ({
      ...state,
      fileMetadataForJob: undefined,
    }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (state: MetadataStateBranch, action: ReplaceUploadAction) => ({
      ...state,
      currentUploadFilePath: action.payload.filePath,
    }),
  },
  [RESET_UPLOAD]: {
    accepts: (action: AnyAction): action is ResetUploadAction =>
      action.type === RESET_UPLOAD,
    perform: (state: MetadataStateBranch) => ({
      ...state,
      currentUploadFilePath: undefined,
      originalUpload: undefined,
    }),
  },
  // this is necessary because we are sharing the upload tab
  [VIEW_UPLOADS]: {
    accepts: (action: AnyAction): action is ViewUploadsAction =>
      action.type === VIEW_UPLOADS,
    perform: (state: MetadataStateBranch) => ({
      ...state,
      currentUploadFilePath: undefined,
    }),
  },
  [VIEW_UPLOADS_SUCCEEDED]: {
    accepts: (action: AnyAction): action is ViewUploadsSucceededAction =>
      action.type === VIEW_UPLOADS_SUCCEEDED,
    perform: (
      state: MetadataStateBranch,
      { payload: { originalUploads } }: ViewUploadsSucceededAction
    ) => ({
      ...state,
      originalUploads,
    }),
  },
  [SAVE_UPLOAD_DRAFT_SUCCESS]: {
    accepts: (action: AnyAction): action is SaveUploadDraftSuccessAction =>
      action.type === SAVE_UPLOAD_DRAFT_SUCCESS,
    perform: (
      state: MetadataStateBranch,
      action: SaveUploadDraftSuccessAction
    ) => ({
      ...state,
      currentUploadFilePath: action.payload,
    }),
  },
};

export default makeReducer<MetadataStateBranch>(
  actionToConfigMap,
  initialState
);
