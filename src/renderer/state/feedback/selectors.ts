import { includes, last } from "lodash";
import { createSelector } from "reselect";

import { AppEvent, AsyncRequest, ModalName, State } from "../types";

// BASIC SELECTORS
export const getIsLoading = (state: State) => state.feedback.isLoading;
export const getAlert = (state: State) => state.feedback.alert;
export const getRequestsInProgress = (state: State) =>
  state.feedback.requestsInProgress;
export const getRequestsInProgressContains = (
  state: State,
  request: AsyncRequest
) => {
  const requestsInProgress = getRequestsInProgress(state);
  return includes(requestsInProgress, request);
};
export const getEvents = (state: State) => state.feedback.events;
export const getDeferredAction = (state: State) =>
  state.feedback.deferredAction;
export const getSetMountPointNotificationVisible = (state: State) =>
  state.feedback.setMountPointNotificationVisible;
export const getTemplateEditorVisible = (state: State) =>
  !!state.feedback.visibleModals.find((m: ModalName) => m === "templateEditor");
export const getTutorialStep = (state: State) => state.feedback.tutorialTooltip;
export const getOpenTemplateModalVisible = (state: State) =>
  !!state.feedback.visibleModals.find((m: ModalName) => m === "openTemplate");
export const getUploadError = (state: State) => state.feedback.uploadError;

// COMPOSED SELECTORS
export const getRecentEvent = createSelector(
  [getEvents],
  (events: AppEvent[]) => last(events)
);

export const getEventsByNewest = createSelector(
  [getEvents],
  (events: AppEvent[]) => [...events].reverse()
);
