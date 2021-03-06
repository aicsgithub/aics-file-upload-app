import { AnyAction } from "redux";

import { CLOSE_NOTIFICATION_CENTER } from "../feedback/constants";
import { CloseNotificationCenter } from "../feedback/types";
import { UPDATE_SETTINGS } from "../setting/constants";
import { UpdateSettingsAction } from "../setting/types";
import { Page, RouteStateBranch, TypeToDescriptionMap } from "../types";
import { INITIATE_UPLOAD_SUCCEEDED, REPLACE_UPLOAD } from "../upload/constants";
import {
  InitiateUploadSucceededAction,
  ReplaceUploadAction,
} from "../upload/types";
import { makeReducer } from "../util";

import {
  CLOSE_UPLOAD,
  SELECT_PAGE,
  SELECT_VIEW,
  START_NEW_UPLOAD,
} from "./constants";
import { getPage } from "./selectors";
import {
  CloseUploadAction,
  SelectPageAction,
  SelectViewAction,
  StartNewUploadAction,
} from "./types";

export const initialState: RouteStateBranch = {
  page: Page.UploadSummary,
  view: Page.UploadSummary,
};

const actionToConfigMap: TypeToDescriptionMap<RouteStateBranch> = {
  [CLOSE_NOTIFICATION_CENTER]: {
    accepts: (action: AnyAction): action is CloseNotificationCenter =>
      action.type === CLOSE_NOTIFICATION_CENTER,
    perform: (state: RouteStateBranch) => ({
      ...state,
      view: state.page,
    }),
  },
  [UPDATE_SETTINGS]: {
    accepts: (action: AnyAction): action is UpdateSettingsAction =>
      action.type === UPDATE_SETTINGS,
    perform: (state: RouteStateBranch) => ({
      ...state,
      view: state.page,
    }),
  },
  [CLOSE_UPLOAD]: {
    accepts: (action: AnyAction): action is CloseUploadAction =>
      action.type === CLOSE_UPLOAD,
    perform: (state: RouteStateBranch) => ({
      ...state,
      page: Page.UploadSummary,
      view: Page.UploadSummary,
    }),
  },
  [START_NEW_UPLOAD]: {
    accepts: (action: AnyAction): action is StartNewUploadAction =>
      action.type === START_NEW_UPLOAD,
    perform: (state: RouteStateBranch) => ({
      ...state,
      page: Page.AddCustomData,
      view: Page.AddCustomData,
    }),
  },
  [INITIATE_UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is InitiateUploadSucceededAction =>
      action.type === INITIATE_UPLOAD_SUCCEEDED,
    perform: (state: RouteStateBranch) => ({
      ...state,
      page: Page.UploadSummary,
      view: Page.UploadSummary,
    }),
  },
  [SELECT_PAGE]: {
    accepts: (action: AnyAction): action is SelectPageAction =>
      action.type === SELECT_PAGE,
    perform: (state: RouteStateBranch, action: SelectPageAction) => ({
      ...state,
      page: action.payload,
      view: action.payload,
    }),
  },
  [SELECT_VIEW]: {
    accepts: (action: AnyAction): action is SelectViewAction =>
      action.type === SELECT_VIEW,
    perform: (state: RouteStateBranch, action: SelectViewAction) => ({
      ...state,
      view: action.payload,
    }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (
      state: RouteStateBranch,
      { payload: { replacementState } }: ReplaceUploadAction
    ) => ({
      ...state,
      page: getPage(replacementState),
      view: getPage(replacementState),
    }),
  },
};

export default makeReducer<RouteStateBranch>(actionToConfigMap, initialState);
