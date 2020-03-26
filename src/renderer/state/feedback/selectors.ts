import { includes, last } from "lodash";
import { createSelector } from "reselect";

import { State } from "../types";

import { AppEvent, AsyncRequest, ModalName } from "./types";

// BASIC SELECTORS
export const getIsLoading = (state: State) => state.feedback.isLoading;
export const getAlert = (state: State) => state.feedback.alert;
export const getRequestsInProgress = (state: State) => state.feedback.requestsInProgress;
export const getRequestsInProgressContains = (state: State, request: AsyncRequest) => {
    const requestsInProgress = getRequestsInProgress(state);
    return includes(requestsInProgress, request);
};
export const getEvents = (state: State) => state.feedback.events;
export const getDeferredAction = (state: State) => state.feedback.deferredAction;
export const getSetMountPointNotificationVisible = (state: State) => state.feedback.setMountPointNotificationVisible;
export const getSettingsEditorVisible = (state: State) => !!state.feedback.visibleModals
    .find((m: ModalName) => m === "settings");
export const getSaveUploadDraftModalVisible = (state: State) => !!state.feedback.visibleModals
    .find((m: ModalName) => m === "saveUploadDraft");
export const getOpenUploadModalVisible = (state: State) => !!state.feedback.visibleModals
    .find((m: ModalName) => m === "openUpload");
export const getTemplateEditorVisible = (state: State) => !!state.feedback.visibleModals
    .find((m: ModalName) => m === "templateEditor");
export const getOpenTemplateModalVisible = (state: State) => !!state.feedback.visibleModals
    .find((m: ModalName) => m === "openTemplate");
export const getUploadError = (state: State) => state.feedback.uploadError;

// COMPOSED SELECTORS
export const getRecentEvent = createSelector([
    getEvents,
], (events: AppEvent[]) => last(events));
