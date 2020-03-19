import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { REPLACE_UPLOAD } from "../upload/constants";
import { ReplaceUploadAction } from "../upload/types";
import { makeReducer } from "../util";
import { SELECT_PAGE, SELECT_VIEW } from "./constants";
import { getPage } from "./selectors";
import { Page, RouteStateBranch, SelectPageAction, SelectViewAction } from "./types";

export const initialState: RouteStateBranch = {
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
    [REPLACE_UPLOAD]: {
        accepts: (action: AnyAction): action is ReplaceUploadAction => action.type === REPLACE_UPLOAD,
        perform: (state: RouteStateBranch, action: ReplaceUploadAction) => ({
            ...state,
            page: getPage(action.payload.state),
            view: getPage(action.payload.state),
        }),
    },
};

export default makeReducer<RouteStateBranch>(actionToConfigMap, initialState);
