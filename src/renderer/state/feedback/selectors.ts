import { includes, last } from "lodash";
import { createSelector } from "reselect";

import { State } from "../types";

import { AppEvent, AsyncRequest } from "./types";

// BASIC SELECTORS
export const getIsLoading = (state: State) => state.feedback.isLoading;
export const getAlert = (state: State) => state.feedback.alert;
export const getRequestsInProgress = (state: State) => state.feedback.requestsInProgress;
export const getRequestsInProgressContains = (state: State, request: AsyncRequest) => {
    const requestsInProgress = getRequestsInProgress(state);
    return includes(requestsInProgress, request);
};
export const getEvents = (state: State) => state.feedback.events;

// COMPOSED SELECTORS
export const getRecentEvent = createSelector([
    getEvents,
], (events: AppEvent[]) => last(events));
