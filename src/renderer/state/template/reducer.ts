import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import { CLOSE_MODAL } from "../feedback/constants";
import { CloseModalAction } from "../feedback/types";
import { RESET_HISTORY } from "../metadata/constants";
import { CLOSE_UPLOAD_TAB } from "../route/constants";
import { CloseUploadTabAction } from "../route/types";
import { TypeToDescriptionMap } from "../types";
import { REPLACE_UPLOAD } from "../upload/constants";
import { ReplaceUploadAction } from "../upload/types";
import { getReduxUndoFilterFn, makeReducer } from "../util";

import {
  CLEAR_TEMPLATE_DRAFT,
  CLEAR_TEMPLATE_HISTORY,
  DEFAULT_TEMPLATE_DRAFT,
  JUMP_TO_PAST_TEMPLATE,
  JUMP_TO_TEMPLATE,
  SET_APPLIED_TEMPLATE,
  START_TEMPLATE_DRAFT,
  UPDATE_TEMPLATE_DRAFT,
} from "./constants";
import { getAppliedTemplate } from "./selectors";
import {
  ClearTemplateDraftAction,
  SetAppliedTemplateAction,
  StartTemplateDraftAction,
  TemplateStateBranch,
  UpdateTemplateDraftAction,
} from "./types";

export const initialState: TemplateStateBranch = {
  appliedTemplate: undefined,
  draft: DEFAULT_TEMPLATE_DRAFT,
  original: undefined,
  originalTemplateHasBeenUsed: undefined,
};

const actionToConfigMap: TypeToDescriptionMap = {
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
  [CLOSE_UPLOAD_TAB]: {
    accepts: (action: AnyAction): action is CloseUploadTabAction =>
      action.type === CLOSE_UPLOAD_TAB,
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
          originalTemplateHasBeenUsed: undefined,
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
      {
        payload: { draft, original, originalTemplateHasBeenUsed },
      }: StartTemplateDraftAction
    ) => ({
      ...state,
      draft,
      original,
      originalTemplateHasBeenUsed,
    }),
  },
};

const template = makeReducer<TemplateStateBranch>(
  actionToConfigMap,
  initialState
);
const options: UndoableOptions = {
  clearHistoryType: CLEAR_TEMPLATE_HISTORY,
  filter: getReduxUndoFilterFn([]),
  initTypes: [RESET_HISTORY],
  jumpToPastType: JUMP_TO_PAST_TEMPLATE,
  jumpType: JUMP_TO_TEMPLATE,
  limit: 100,
};
export default undoable(template, options);
