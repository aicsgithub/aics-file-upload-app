import { expect } from "chai";

import { closeUploadTab, openEditFileMetadataTab } from "../../route/actions";
import { openTemplateEditor, selectBarcode, setPlate } from "../../selection/actions";
import { mockPlate, mockSuccessfulUploadJob, mockWells } from "../../test/mocks";
import {
    addEvent,
    addRequestToInProgress,
    clearAlert,
    clearDeferredAction, clearUploadError,
    closeModal,
    closeSetMountPointNotification,
    openModal,
    openSetMountPointNotification,
    removeRequestFromInProgress,
    setAlert,
    setDeferredAction,
    setErrorAlert, setUploadError,
    startLoading,
    stopLoading,
} from "../actions";

import reducer from "../reducer";
import { initialState } from "../reducer";
import { AlertType, AsyncRequest, FeedbackStateBranch } from "../types";

describe("feedback reducer", () => {
    describe("clearAlert", () => {
        let stateWithAlert: FeedbackStateBranch;
        beforeEach(() => {
            stateWithAlert = {
                ...initialState,
                alert: {
                    message: "foo",
                    type: AlertType.SUCCESS,
                },
            };
        });
        it("sets alert to undefined", () => {
            const result = reducer(stateWithAlert, clearAlert());
            expect(result.alert).to.be.undefined;
        });
        it("appends a new event to events", () => {
            const result = reducer(stateWithAlert, clearAlert());
            expect(result.events.length).to.equal(1);
        });
        it("does not change state if no alert to clear", () => {
            const result = reducer(initialState, clearAlert());
            expect(result).to.equal(initialState);
        });
    });
    describe("setAlert", () => {
        it("sets alert with original message if provided", () => {
            const message = "foo";
            const result = reducer(initialState, setAlert({
                message,
                type: AlertType.ERROR,
            }));
            expect(result.alert).to.not.be.undefined;
            if (result.alert) {
                expect(result.alert.message).to.equal(message);
            }
        });
        it("it adds the message 'Bad Gateway Error: Labkey or MMS is down.' if the statusCode is 502", () => {
            const result = reducer(initialState, setAlert({
                message: undefined,
                statusCode: 502,
                type: AlertType.ERROR,
            }));
            expect(result.alert).to.not.be.undefined;
            if (result.alert) {
                expect(result.alert.message).to.equal("Bad Gateway Error: Labkey or MMS is down.");
            }
        });
    });
    describe("startLoading", () => {
        it("sets isLoading to true", () => {
            const result = reducer(initialState, startLoading());
            expect(result.isLoading).to.be.true;
        });
    });
    describe("stopLoading", () => {
        it("sets isLoading to false", () => {
            const result = reducer({...initialState, isLoading: false}, stopLoading());
            expect(result.isLoading).to.be.false;
        });
    });
    describe("addRequestInProgress", () => {
        it("adds request to requestsInProgress", () => {
            const result = reducer(initialState, addRequestToInProgress(AsyncRequest.GET_TEMPLATE));
            expect(result.requestsInProgress.includes(AsyncRequest.GET_TEMPLATE)).to.be.true;
        });
        it("does not add same request more than once", () => {
            const result = reducer({
                ...initialState,
                requestsInProgress: [AsyncRequest.GET_TEMPLATE],
            }, addRequestToInProgress(AsyncRequest.GET_TEMPLATE));
            expect(result.requestsInProgress.length).to.equal(1);
        });
    });
    describe("removeRequestInProgress", () => {
        it("removes request from requestsInProgress", () => {
            const result = reducer({
                ...initialState,
                requestsInProgress: [AsyncRequest.GET_TEMPLATE],
            }, removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE));
            expect(result.requestsInProgress).to.be.empty;
        });
    });
    describe("addEvent", () => {
        it("adds event to events", () => {
            const result = reducer(initialState, addEvent("foo", AlertType.ERROR, new Date()));
            expect(result.events.length).to.equal(1);
        });
    });
    describe("openSetMountPointNotification", () => {
        it("sets setMountPointNotificationVisible to true", () => {
            const result = reducer(initialState, openSetMountPointNotification());
            expect(result.setMountPointNotificationVisible).to.be.true;
        });
    });
    describe("closeSetMountPointNotification", () => {
        it("sets setMountPointNotificationVisible to false", () => {
            const result = reducer({
                ...initialState,
                setMountPointNotificationVisible: true,
            }, closeSetMountPointNotification());
            expect(result.setMountPointNotificationVisible).to.be.false;
        });
    });
    describe("openModal", () => {
        it("adds modalName to visibleModals", () => {
            const result = reducer(initialState, openModal("openTemplate"));
            expect(result.visibleModals.length).to.equal(1);
        });
    });
    describe("closeModal", () => {
        it("removes modalName from visibleModals", () => {
            const result = reducer({...initialState, visibleModals: ["openTemplate"]}, closeModal("openTemplate"));
            expect(result.visibleModals).to.be.empty;
        });
    });
    describe("openTemplateEditor", () => {
        it("adds templateEditor to visibleModals", () => {
            const result = reducer(initialState, openTemplateEditor());
            expect(result.visibleModals.includes("templateEditor")).to.be.true;
        });
    });
    describe("setDeferredAction", () => {
        it("sets deferredAction", () => {
            const result = reducer(initialState, setDeferredAction(setErrorAlert("foo")));
            expect(result.deferredAction).to.not.be.undefined;
        });
    });
    describe("clearDeferredAction", () => {
        it("clears deferredAction", () => {
            const result = reducer({
                ...initialState,
                deferredAction: setErrorAlert("foo"),
            }, clearDeferredAction());
            expect(result.deferredAction).to.be.undefined;
        });
    });
    describe("closeUploadTab", () => {
        it("closes setMountPointNotification", () => {
            const result = reducer({
                ...initialState,
                setMountPointNotificationVisible: true,
            }, closeUploadTab());
            expect(result.setMountPointNotificationVisible).to.be.false;
        });
    });
    describe("setUploadError", () => {
        it("sets uploadError", () => {
            const result = reducer(initialState, setUploadError("foo"));
            expect(result.uploadError).to.equal("foo");
        });
    });
    describe("clearUploadError", () => {
        it("clears uploadError", () => {
            const result = reducer({...initialState, uploadError: "foo"}, clearUploadError());
            expect(result.uploadError).to.be.undefined;
        });
    });
    describe("openEditFileMetadataTab", () => {
        it("adds request in progress for REQUEST_FILE_METADATA_FOR_JOB", () => {
            const result = reducer(initialState, openEditFileMetadataTab(mockSuccessfulUploadJob));
            expect(result.requestsInProgress.includes(AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB));
        });
    });
    describe("requestFileMetadataForJob", () => {
        it("adds request in progress for REQUEST_FILE_METADATA_FOR_JOB", () => {
            const result = reducer(initialState, openEditFileMetadataTab(mockSuccessfulUploadJob));
            expect(result.requestsInProgress.includes(AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB));
        });
    });
    describe("selectBarcode", () => {
        it("adds GET_PLATE from requestsInProgress", () => {
            const result = reducer(initialState, selectBarcode("foo"));
            expect(result.requestsInProgress.includes(AsyncRequest.GET_PLATE)).to.be.true;
        });
    });
    describe("setPlate", () => {
        it("removes GET_PLATE from requestsInProgress", () => {
            const result = reducer({...initialState, requestsInProgress: [AsyncRequest.GET_PLATE]},
                setPlate(mockPlate, mockWells, [null])
            );
            expect(result.requestsInProgress.includes(AsyncRequest.GET_PLATE)).to.be.false;
        });
    });
});
