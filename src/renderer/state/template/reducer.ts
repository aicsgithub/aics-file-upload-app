import { AnyAction } from "redux";

import { CLOSE_MODAL } from "../feedback/constants";
import { CloseModalAction } from "../feedback/types";
import { RESET_UPLOAD } from "../route/constants";
import { ResetUploadAction } from "../route/types";
import { TemplateStateBranch, TypeToDescriptionMap } from "../types";
import { REPLACE_UPLOAD } from "../upload/constants";
import { ReplaceUploadAction } from "../upload/types";
import { makeReducer } from "../util";

import {
  CLEAR_TEMPLATE_DRAFT,
  DEFAULT_TEMPLATE_DRAFT,
  SET_APPLIED_TEMPLATE,
  START_TEMPLATE_DRAFT,
  UPDATE_TEMPLATE_DRAFT,
} from "./constants";
import { getAppliedTemplate } from "./selectors";
import {
  ClearTemplateDraftAction,
  SetAppliedTemplateAction,
  StartTemplateDraftAction,
  UpdateTemplateDraftAction,
} from "./types";

export const initialState: TemplateStateBranch = {
  appliedTemplate: undefined,
  draft: DEFAULT_TEMPLATE_DRAFT,
  original: undefined,
};

const actionToConfigMap: TypeToDescriptionMap<TemplateStateBranch> = {
  [CLEAR_TEMPLATE_DRAFT]: {
    accepts: (action: AnyAction): action is ClearTemplateDraftAction =>
      action.type === CLEAR_TEMPLATE_DRAFT,
    perform: (state: TemplateStateBranch) => ({
      ...state,
      draft: { ...DEFAULT_TEMPLATE_DRAFT },
    }),
  },
  [SET_APPLIED_TEMPLATE]: {
    accepts: (action: AnyAction): action is SetAppliedTemplateAction =>
      action.type === SET_APPLIED_TEMPLATE,
    perform: (
      state: TemplateStateBranch,
      action: SetAppliedTemplateAction
    ) => ({
      ...state,
      appliedTemplate: action.payload.template,
    }),
  },
  [UPDATE_TEMPLATE_DRAFT]: {
    accepts: (action: AnyAction): action is UpdateTemplateDraftAction =>
      action.type === UPDATE_TEMPLATE_DRAFT,
    perform: (
      state: TemplateStateBranch,
      action: UpdateTemplateDraftAction
    ) => ({
      ...state,
      draft: {
        ...state.draft,
        ...action.payload,
      },
    }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (
      state: TemplateStateBranch,
      { payload: { replacementState } }: ReplaceUploadAction
    ) => ({
      ...state,
      appliedTemplate: getAppliedTemplate(replacementState),
    }),
  },
  [RESET_UPLOAD]: {
    accepts: (action: AnyAction): action is ResetUploadAction =>
      action.type === RESET_UPLOAD,
    perform: (state: TemplateStateBranch) => ({
      ...state,
      appliedTemplate: undefined,
    }),
  },
  [CLOSE_MODAL]: {
    accepts: (action: AnyAction): action is CloseModalAction =>
      action.type === CLOSE_MODAL,
    perform: (state: TemplateStateBranch, { payload }: CloseModalAction) => {
      if (payload === "templateEditor") {
        return {
          ...state,
          draft: DEFAULT_TEMPLATE_DRAFT,
          original: undefined,
        };
      }
      return state;
    },
  },
  [START_TEMPLATE_DRAFT]: {
    accepts: (action: AnyAction): action is StartTemplateDraftAction =>
      action.type === START_TEMPLATE_DRAFT,
    perform: (
      state: TemplateStateBranch,
      { payload: { draft, original } }: StartTemplateDraftAction
    ) => ({
      ...state,
      draft,
      original,
    }),
  },
};

export default makeReducer<TemplateStateBranch>(
  actionToConfigMap,
  initialState
);
