import { AnyAction } from "redux";

import { CLOSE_NOTIFICATION_CENTER } from "../feedback/constants";
import { CloseNotificationCenter } from "../feedback/types";
import { UPDATE_SETTINGS } from "../setting/constants";
import { UpdateSettingsAction } from "../setting/types";
import { Page, RouteStateBranch, TypeToDescriptionMap } from "../types";
import { INITIATE_UPLOAD_SUCCEEDED } from "../upload/constants";
import { InitiateUploadSucceededAction } from "../upload/types";
import { makeReducer } from "../util";

import {
  CLOSE_UPLOAD,
  SELECT_PAGE,
  SELECT_VIEW,
  START_NEW_UPLOAD,
} from "./constants";
import {
  CloseUploadAction,
  SelectPageAction,
  SelectViewAction,
  StartNewUploadAction,
} from "./types";

export const initialState: RouteStateBranch = {
  page: Page.MyUploads,
  view: Page.MyUploads,
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
      page: Page.MyUploads,
      view: Page.MyUploads,
    }),
  },
  [START_NEW_UPLOAD]: {
    accepts: (action: AnyAction): action is StartNewUploadAction =>
      action.type === START_NEW_UPLOAD,
    perform: (state: RouteStateBranch) => ({
      ...state,
      page: Page.UploadWithTemplate,
      view: Page.UploadWithTemplate,
    }),
  },
  [INITIATE_UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is InitiateUploadSucceededAction =>
      action.type === INITIATE_UPLOAD_SUCCEEDED,
    perform: (state: RouteStateBranch) => ({
      ...state,
      page: Page.MyUploads,
      view: Page.MyUploads,
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
};

export default makeReducer<RouteStateBranch>(actionToConfigMap, initialState);
