import { expect } from "chai";

import { receiveJobs, retrieveJobs } from "../../job/actions";
import {
  receiveFileMetadata,
  requestFileMetadataForJob,
} from "../../metadata/actions";
import {
  closeUploadTab,
  openEditFileMetadataTab,
  selectPage,
} from "../../route/actions";
import { Page } from "../../route/types";
import {
  openTemplateEditor,
  selectBarcode,
  setPlate,
} from "../../selection/actions";
import {
  clearTemplateDraft,
  saveTemplate,
  setAppliedTemplate,
} from "../../template/actions";
import {
  mockFailedUploadJob,
  mockMMSTemplate,
  mockPlate,
  mockSuccessfulUploadJob,
  mockWells,
} from "../../test/mocks";
import {
  applyTemplate,
  cancelUpload,
  cancelUploadFailed,
  cancelUploadSucceeded,
  initiateUpload,
  retryUpload,
  retryUploadFailed,
  retryUploadSucceeded,
} from "../../upload/actions";
import {
  addEvent,
  addRequestToInProgress,
  clearAlert,
  clearDeferredAction,
  clearUploadError,
  closeModal,
  closeSetMountPointNotification,
  openModal,
  openSetMountPointNotification,
  removeRequestFromInProgress,
  setAlert,
  setDeferredAction,
  setErrorAlert,
  setUploadError,
  startLoading,
  stopLoading,
  toggleFolderTree,
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
      const result = reducer(
        initialState,
        setAlert({
          message,
          type: AlertType.ERROR,
        })
      );
      expect(result.alert).to.not.be.undefined;
      if (result.alert) {
        expect(result.alert.message).to.equal(message);
      }
    });
    it("it adds the message 'Bad Gateway Error: Labkey or MMS is down.' if the statusCode is 502", () => {
      const result = reducer(
        initialState,
        setAlert({
          message: undefined,
          statusCode: 502,
          type: AlertType.ERROR,
        })
      );
      expect(result.alert).to.not.be.undefined;
      if (result.alert) {
        expect(result.alert.message).to.equal(
          "Bad Gateway Error: Labkey or MMS is down."
        );
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
      const result = reducer(
        { ...initialState, isLoading: false },
        stopLoading()
      );
      expect(result.isLoading).to.be.false;
    });
  });
  describe("addRequestInProgress", () => {
    it("adds request to requestsInProgress", () => {
      const result = reducer(
        initialState,
        addRequestToInProgress(AsyncRequest.GET_TEMPLATE)
      );
      expect(result.requestsInProgress.includes(AsyncRequest.GET_TEMPLATE)).to
        .be.true;
    });
    it("does not add same request more than once", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_TEMPLATE],
        },
        addRequestToInProgress(AsyncRequest.GET_TEMPLATE)
      );
      expect(result.requestsInProgress.length).to.equal(1);
    });
  });
  describe("removeRequestInProgress", () => {
    it("removes request from requestsInProgress", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_TEMPLATE],
        },
        removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE)
      );
      expect(result.requestsInProgress).to.be.empty;
    });
  });
  describe("addEvent", () => {
    it("adds event to events", () => {
      const result = reducer(
        initialState,
        addEvent("foo", AlertType.ERROR, new Date())
      );
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
      const result = reducer(
        {
          ...initialState,
          setMountPointNotificationVisible: true,
        },
        closeSetMountPointNotification()
      );
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
      const result = reducer(
        { ...initialState, visibleModals: ["openTemplate"] },
        closeModal("openTemplate")
      );
      expect(result.visibleModals).to.be.empty;
    });
  });
  describe("openTemplateEditor", () => {
    it("adds templateEditor to visibleModals", () => {
      const result = reducer(initialState, openTemplateEditor());
      expect(result.visibleModals.includes("templateEditor")).to.be.true;
    });
    it("sets clearTemplateDraft as the deferredAction", () => {
      const result = reducer(initialState, openTemplateEditor());
      expect(result.deferredAction).to.deep.equal(clearTemplateDraft());
    });
  });
  describe("setDeferredAction", () => {
    it("sets deferredAction", () => {
      const result = reducer(
        initialState,
        setDeferredAction(setErrorAlert("foo"))
      );
      expect(result.deferredAction).to.not.be.undefined;
    });
  });
  describe("clearDeferredAction", () => {
    it("clears deferredAction", () => {
      const result = reducer(
        {
          ...initialState,
          deferredAction: setErrorAlert("foo"),
        },
        clearDeferredAction()
      );
      expect(result.deferredAction).to.be.undefined;
    });
  });
  describe("closeUploadTab", () => {
    it("closes setMountPointNotification", () => {
      const result = reducer(
        {
          ...initialState,
          setMountPointNotificationVisible: true,
          uploadError: "foo",
        },
        closeUploadTab()
      );
      expect(result.setMountPointNotificationVisible).to.be.false;
      expect(result.uploadError).to.be.undefined;
    });
  });
  describe("setUploadError", () => {
    it("sets uploadError", () => {
      const request = `${AsyncRequest.INITIATE_UPLOAD}-jobName`;
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [request],
        },
        setUploadError("jobName", "foo")
      );
      expect(result.uploadError).to.equal("foo");
      expect(result.requestsInProgress.includes(request)).to.be.false;
    });
  });
  describe("clearUploadError", () => {
    it("clears uploadError", () => {
      const result = reducer(
        { ...initialState, uploadError: "foo" },
        clearUploadError()
      );
      expect(result.uploadError).to.be.undefined;
    });
  });
  describe("openEditFileMetadataTab", () => {
    it("adds request in progress for REQUEST_FILE_METADATA_FOR_JOB", () => {
      const result = reducer(
        initialState,
        openEditFileMetadataTab(mockSuccessfulUploadJob)
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
        )
      );
    });
  });
  describe("requestFileMetadataForJob", () => {
    it("adds request in progress for REQUEST_FILE_METADATA_FOR_JOB", () => {
      const result = reducer(
        initialState,
        openEditFileMetadataTab(mockSuccessfulUploadJob)
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
        )
      );
    });
  });
  describe("selectBarcode", () => {
    it("adds GET_PLATE from requestsInProgress", () => {
      const result = reducer(initialState, selectBarcode("foo"));
      expect(result.requestsInProgress.includes(AsyncRequest.GET_PLATE)).to.be
        .true;
    });
  });
  describe("setPlate", () => {
    it("removes GET_PLATE from requestsInProgress", () => {
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.GET_PLATE] },
        setPlate(mockPlate, mockWells, [null])
      );
      expect(result.requestsInProgress.includes(AsyncRequest.GET_PLATE)).to.be
        .false;
    });
  });
  describe("requestFileMetadataForJob", () => {
    it("adds REQUEST_FILE_METADATA_FOR_JOB to requestsInProgress", () => {
      const result = reducer(initialState, requestFileMetadataForJob(["abc"]));
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
        )
      ).to.be.true;
    });
  });
  describe("receiveFileMetadata", () => {
    it("removes REQUEST_FILE_METADATA_FOR_JOB from requestsInProgress", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB],
        },
        receiveFileMetadata([{ foo: "bar" }])
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
        )
      ).to.be.false;
    });
  });
  describe("applyTemplate", () => {
    it("adds GET_TEMPLATE to requestsInProgress", () => {
      const result = reducer(initialState, applyTemplate(1));
      expect(result.requestsInProgress.includes(AsyncRequest.GET_TEMPLATE)).to
        .be.true;
    });
  });
  describe("setAppliedTemplate", () => {
    it("removes GET_TEMPLATE from requestsInProgress", () => {
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.GET_TEMPLATE] },
        setAppliedTemplate(mockMMSTemplate, {})
      );
      expect(result.requestsInProgress.includes(AsyncRequest.GET_TEMPLATE)).to
        .be.false;
    });
  });
  describe("saveTemplate", () => {
    it("adds SAVE_TEMPLATE to requestsInProgress", () => {
      const result = reducer(initialState, saveTemplate());
      expect(result.requestsInProgress.includes(AsyncRequest.SAVE_TEMPLATE)).to
        .be.true;
    });
  });
  describe("retrieveJobs", () => {
    it("adds GET_JOBS to requestsInProgress", () => {
      const result = reducer(initialState, retrieveJobs());
      expect(result.requestsInProgress.includes(AsyncRequest.GET_JOBS)).to.be
        .true;
    });
  });
  describe("receiveJobs", () => {
    it("removes GET_JOBS from requestsInProgress", () => {
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.GET_JOBS] },
        receiveJobs([])
      );
      expect(!result.requestsInProgress.includes(AsyncRequest.GET_JOBS)).to.be
        .true;
    });
  });
  describe("initiateUpload", () => {
    it("adds INITIATE_UPLOAD-jobName to requestsInProgress and sets info alert", () => {
      const action = initiateUpload();
      const result = reducer(initialState, {
        ...action,
        payload: {
          ...action.payload,
          jobName: "foo", // this gets populated in the logics
        },
      });
      expect(result.requestsInProgress.includes("INITIATE_UPLOAD-foo"));
      expect(result.alert).to.deep.equal({
        message: "Starting upload",
        type: AlertType.INFO,
      });
    });
  });
  describe("retryUpload", () => {
    it("adds RETRY_UPLOAD to requestsInProgress and sets info alert", () => {
      const result = reducer(
        initialState,
        retryUpload({
          ...mockFailedUploadJob,
          key: "something",
        })
      );
      expect(result.requestsInProgress.includes(AsyncRequest.RETRY_UPLOAD)).to
        .be.true;
      expect(result.alert).to.deep.equal({
        message: "Retrying upload mockFailedUploadJob",
        type: AlertType.INFO,
      });
    });
  });
  describe("retryUploadSucceeded", () => {
    it("removes RETRY_UPLOAD from requestsInProgress and sets success alert", () => {
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.RETRY_UPLOAD] },
        retryUploadSucceeded({ ...mockSuccessfulUploadJob, key: "cat" })
      );
      expect(result.requestsInProgress.includes(AsyncRequest.RETRY_UPLOAD)).to
        .be.false;
      expect(result.alert).to.deep.equal({
        message: "Retry upload mockJob1 succeeded!",
        type: AlertType.SUCCESS,
      });
    });
  });
  describe("retryUploadFailed", () => {
    it("removes RETRY_UPLOAD from requestsInProgress and sets error alert", () => {
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.RETRY_UPLOAD] },
        retryUploadFailed({ ...mockFailedUploadJob, key: "cat" }, "foo")
      );
      expect(result.requestsInProgress.includes(AsyncRequest.RETRY_UPLOAD)).to
        .be.false;
      expect(result.alert).to.deep.equal({
        message: "foo",
        type: AlertType.ERROR,
      });
    });
  });
  describe("cancelUpload", () => {
    it("adds CANCEL_UPLOAD to requestsInProgress and sets info alert", () => {
      const result = reducer(
        initialState,
        cancelUpload({ ...mockSuccessfulUploadJob, key: "cat" })
      );
      expect(result.requestsInProgress.includes(AsyncRequest.CANCEL_UPLOAD));
      expect(result.alert).to.deep.equal({
        message: "Cancelling upload mockJob1",
        type: AlertType.INFO,
      });
    });
  });
  describe("cancelUploadSucceeded", () => {
    it("removes CANCEL_UPLOAD from requestsInProgress and sets success alert", () => {
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.CANCEL_UPLOAD] },
        cancelUploadSucceeded({ ...mockSuccessfulUploadJob, key: "cat" })
      );
      expect(result.requestsInProgress.includes(AsyncRequest.CANCEL_UPLOAD)).to
        .be.false;
      expect(result.alert).to.deep.equal({
        message: "Cancel upload mockJob1 succeeded",
        type: AlertType.SUCCESS,
      });
    });
  });
  describe("cancelUploadFailed", () => {
    it("removes CANCEL_UPLOAD from requestsInProgress and sets error alert", () => {
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.CANCEL_UPLOAD] },
        cancelUploadFailed({ ...mockSuccessfulUploadJob, key: "cat" }, "foo")
      );
      expect(result.requestsInProgress.includes(AsyncRequest.CANCEL_UPLOAD)).to
        .be.false;
      expect(result.alert).to.deep.equal({
        message: "foo",
        type: AlertType.ERROR,
      });
    });
  });
  describe("toggleFolderTree", () => {
    it("sets folderTreeOpen to opposite value it was set to before", () => {
      const result = reducer(initialState, toggleFolderTree());
      expect(result.folderTreeOpen).to.be.true;
    });
  });
  describe("selectPage", () => {
    it("sets folderTreeOpen to true if page is AssociateFiles", () => {
      const result = reducer(
        initialState,
        selectPage(Page.SelectUploadType, Page.AssociateFiles)
      );
      expect(result.folderTreeOpen).to.be.true;
    });
    it("sets folderTreeOpen to true if page is SelectStorageLocation", () => {
      const result = reducer(
        initialState,
        selectPage(Page.AssociateFiles, Page.SelectStorageLocation)
      );
      expect(result.folderTreeOpen).to.be.true;
    });
    it("sets folderTreeOpen to false if page is AddCustomData", () => {
      const result = reducer(
        initialState,
        selectPage(Page.SelectStorageLocation, Page.AddCustomData)
      );
      expect(result.folderTreeOpen).to.be.false;
    });
    it("sets folderTreeOpen to false if page is UploadSummary", () => {
      const result = reducer(
        initialState,
        selectPage(Page.AddCustomData, Page.UploadSummary)
      );
      expect(result.folderTreeOpen).to.be.false;
    });
  });
});
