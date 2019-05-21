import { uniq } from "lodash";
import { AnyAction } from "redux";

import {
    TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import {
    ADD_EVENT,
    ADD_REQUEST_IN_PROGRESS,
    CLEAR_ALERT,
    REMOVE_REQUEST_IN_PROGRESS,
    SET_ALERT,
    START_LOADING,
    STOP_LOADING,
} from "./constants";
import {
    AddEventAction,
    AddRequestInProgressAction,
    ClearAlertAction,
    FeedbackStateBranch,
    RemoveRequestInProgressAction,
    SetAlertAction,
    StartLoadingAction,
    StopLoadingAction
} from "./types";

export const initialState: FeedbackStateBranch = {
    events: [],
    isLoading: false,
    requestsInProgress: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [CLEAR_ALERT]: {
        accepts: (action: AnyAction): action is ClearAlertAction => action.type === CLEAR_ALERT,
        perform: (state: FeedbackStateBranch) => {
            return {
                ...state,
                alert: undefined,
            };
        },
    },
    [SET_ALERT]: {
        accepts: (action: AnyAction): action is SetAlertAction => action.type === SET_ALERT,
        perform: (state: FeedbackStateBranch, action: SetAlertAction) => {
            return {
                ...state,
                alert: action.payload,
            };
        },
    },
    [START_LOADING]: {
        accepts: (action: AnyAction): action is StartLoadingAction => action.type === START_LOADING,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            isLoading: true,
        }),
    },
    [STOP_LOADING]: {
        accepts: (action: AnyAction): action is StopLoadingAction => action.type === STOP_LOADING,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            isLoading: false,
        }),
    },
    [ADD_REQUEST_IN_PROGRESS]: {
        accepts: (action: AnyAction): action is AddRequestInProgressAction => action.type === ADD_REQUEST_IN_PROGRESS,
        perform: (state: FeedbackStateBranch, action: AddRequestInProgressAction) => {
            const requestsInProgress = uniq([...state.requestsInProgress, action.payload]);

            return {
                ...state,
                requestsInProgress,
            };
        },
    },
    [REMOVE_REQUEST_IN_PROGRESS]: {
        accepts: (action: AnyAction): action is RemoveRequestInProgressAction =>
            action.type === REMOVE_REQUEST_IN_PROGRESS,
        perform: (state: FeedbackStateBranch, action: RemoveRequestInProgressAction) => {
            const requestsInProgress = state.requestsInProgress.filter((req) => req !== action.payload);

            return {
                ...state,
                requestsInProgress,
            };
        },
    },
    [ADD_EVENT]: {
        accepts: (action: AnyAction): action is AddEventAction => action.type === ADD_EVENT,
        perform: (state: FeedbackStateBranch, action: AddEventAction) => {
            return {
                ...state,
                events: [...state.events, action.payload],
            };
        },
    },
};

export default makeReducer<FeedbackStateBranch>(actionToConfigMap, initialState);
