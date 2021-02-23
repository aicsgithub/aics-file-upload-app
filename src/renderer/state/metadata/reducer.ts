import { AnyAction } from "redux";

import {
  OPEN_EDIT_FILE_METADATA_TAB,
  OPEN_EDIT_FILE_METADATA_TAB_SUCCEEDED,
  RESET_UPLOAD,
} from "../route/constants";
import {
  OpenEditFileMetadataTabAction,
  OpenEditFileMetadataTabSucceededAction,
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
  RECEIVE_METADATA,
  RESET_HISTORY,
  UPDATE_PAGE_HISTORY,
} from "./constants";
import {
  ClearFileMetadataForJobAction,
  ClearOptionsForLookupAction,
  ReceiveMetadataAction,
  ResetHistoryAction,
  UpdatePageHistoryMapAction,
} from "./types";

export const initialState: MetadataStateBranch = {
  annotationLookups: [],
  annotationOptions: [],
  annotationTypes: [],
  annotations: [],
  barcodePrefixes: [],
  barcodeSearchResults: [],
  channels: [],
  history: {
    selection: {},
    template: {},
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
  [RESET_HISTORY]: {
    accepts: (action: AnyAction): action is ResetHistoryAction =>
      action.type === RESET_HISTORY,
    perform: (state: MetadataStateBranch) => ({
      ...state,
      history: {
        selection: {},
        template: {},
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
        template: {
          ...state.history.template,
          ...action.payload.template,
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
  [OPEN_EDIT_FILE_METADATA_TAB]: {
    accepts: (action: AnyAction): action is OpenEditFileMetadataTabAction =>
      action.type === OPEN_EDIT_FILE_METADATA_TAB,
    perform: (state: MetadataStateBranch) => ({
      ...state,
      currentUploadFilePath: undefined,
    }),
  },
  [OPEN_EDIT_FILE_METADATA_TAB_SUCCEEDED]: {
    accepts: (
      action: AnyAction
    ): action is OpenEditFileMetadataTabSucceededAction =>
      action.type === OPEN_EDIT_FILE_METADATA_TAB_SUCCEEDED,
    perform: (
      state: MetadataStateBranch,
      { payload: { originalUpload } }: OpenEditFileMetadataTabSucceededAction
    ) => ({
      ...state,
      originalUpload,
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
