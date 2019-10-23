import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    CLEAR_TEMPLATE_DRAFT,
    CLEAR_TEMPLATE_HISTORY,
    DEFAULT_TEMPLATE_DRAFT,
    JUMP_TO_PAST_TEMPLATE,
    JUMP_TO_TEMPLATE,
    UPDATE_TEMPLATE_DRAFT,
} from "./constants";

import { ClearTemplateDraftAction, TemplateStateBranch, UpdateTemplateDraftAction } from "./types";

export const initialState: TemplateStateBranch = {
    draft: DEFAULT_TEMPLATE_DRAFT,
};

const actionToConfigMap: TypeToDescriptionMap = {
    [CLEAR_TEMPLATE_DRAFT]: {
        accepts: (action: AnyAction): action is ClearTemplateDraftAction => action.type === CLEAR_TEMPLATE_DRAFT,
        perform: (state: TemplateStateBranch) => ({
            ...state,
            draft: {...DEFAULT_TEMPLATE_DRAFT},
        }),
    },
    [UPDATE_TEMPLATE_DRAFT]: {
        accepts: (action: AnyAction): action is UpdateTemplateDraftAction => action.type === UPDATE_TEMPLATE_DRAFT,
        perform: (state: TemplateStateBranch, action: UpdateTemplateDraftAction) => ({
            ...state,
            draft: {
                ...state.draft,
                ...action.payload,
            },
        }),
    },
};

const template = makeReducer<TemplateStateBranch>(actionToConfigMap, initialState);
const options: UndoableOptions = {
    clearHistoryType: CLEAR_TEMPLATE_HISTORY, // todo need?
    jumpToPastType: JUMP_TO_PAST_TEMPLATE,
    jumpType: JUMP_TO_TEMPLATE,
    limit: 100,
};
export default undoable(template, options);
