import { AnyAction } from "redux";

import { CLOSE_MODAL } from "../feedback/constants";
import { CloseModalAction } from "../feedback/types";
import { RESET_UPLOAD } from "../route/constants";
import { ResetUploadAction } from "../route/types";
import { TemplateStateBranch, TypeToDescriptionMap } from "../types";
import { REPLACE_UPLOAD } from "../upload/constants";
import { ReplaceUploadAction } from "../upload/types";
import { makeReducer } from "../util";

import { SET_APPLIED_TEMPLATE, START_EDITING_TEMPLATE } from "./constants";
import { getAppliedTemplate } from "./selectors";
import { SetAppliedTemplateAction, StartEditingTemplateAction } from "./types";

export const initialState: TemplateStateBranch = {};

const actionToConfigMap: TypeToDescriptionMap<TemplateStateBranch> = {
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
  [START_EDITING_TEMPLATE]: {
    accepts: (action: AnyAction): action is StartEditingTemplateAction =>
      action.type === START_EDITING_TEMPLATE,
    perform: (
      state: TemplateStateBranch,
      action: StartEditingTemplateAction
    ) => ({
      ...state,
      templateToEdit: action.payload,
    }),
  },
  [CLOSE_MODAL]: {
    accepts: (action: AnyAction): action is CloseModalAction =>
      action.type === CLOSE_MODAL,
    perform: (state: TemplateStateBranch, { payload }: CloseModalAction) => {
      if (payload === "templateEditor") {
        return {
          ...state,
          templateToEdit: undefined,
        };
      }
      return state;
    },
  },
};

export default makeReducer<TemplateStateBranch>(
  actionToConfigMap,
  initialState
);
