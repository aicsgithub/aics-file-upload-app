import { AnyAction } from "redux";
import { OPEN_MODAL } from "../selection/constants";
import { OpenModalAction } from "../selection/types";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { SELECT_PAGE, SELECT_VIEW } from "./constants";
import { Page, RouteStateBranch, SelectPageAction, SelectViewAction } from "./types";

export const initialState: RouteStateBranch = {
    nextPage: undefined,
    page: Page.UploadSummary,
    view: Page.UploadSummary,
};

const actionToConfigMap: TypeToDescriptionMap = {
    [SELECT_PAGE]: {
        accepts: (action: AnyAction): action is SelectPageAction => action.type === SELECT_PAGE,
        perform: (state: RouteStateBranch, action: SelectPageAction) => ({
            ...state,
            nextPage: undefined,
            page: action.payload.nextPage,
            view: action.payload.nextPage,
        }),
    },
    [SELECT_VIEW]: {
        accepts: (action: AnyAction): action is SelectViewAction => action.type === SELECT_VIEW,
        perform: (state: RouteStateBranch, action: SelectViewAction) => ({
            ...state,
            view: action.payload,
        }),
    },
    [OPEN_MODAL]: {
        accepts: (action: AnyAction): action is OpenModalAction => action.type === OPEN_MODAL,
        perform: (state: RouteStateBranch, action: OpenModalAction) => {
            if (action.payload === "saveUploadDraft") {
                return {
                    ...state,
                    nextPage: Page.UploadSummary,
                };
            }

            return state;
        },
    },
    [OPEN_MODAL]: {
        accepts: (action: AnyAction): action is OpenModalAction => action.type === OPEN_MODAL,
        perform: (state: RouteStateBranch, action: OpenModalAction) => {
            if (action.payload === "saveUploadDraft") {
                return {
                    ...state,
                    nextPage: Page.UploadSummary,
                };
            }
            return state;
        },
    },
};

export default makeReducer<RouteStateBranch>(actionToConfigMap, initialState);
