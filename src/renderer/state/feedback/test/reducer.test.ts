import { expect } from "chai";

import { receiveJobs } from "../../job/actions";
import { requestFileMetadataForJob } from "../../metadata/actions";
import {
  closeUploadTab,
  openEditFileMetadataTab,
  openEditFileMetadataTabSucceeded,
  selectPage,
} from "../../route/actions";
import {
  openTemplateEditor,
  selectBarcode,
  setPlate,
} from "../../selection/actions";
import {
  clearTemplateDraft,
  saveTemplate,
  saveTemplateSucceeded,
  setAppliedTemplate,
  startTemplateDraft,
  startTemplateDraftFailed,
} from "../../template/actions";
import {
  mockFailedUploadJob,
  mockMMSTemplate,
  mockPlate,
  mockSuccessfulUploadJob,
  mockWells,
  mockTemplateDraft,
  mockWellUpload,
} from "../../test/mocks";
import {
  AlertType,
  AsyncRequest,
  FeedbackStateBranch,
  Page,
} from "../../types";
import {
  applyTemplate,
  cancelUpload,
  cancelUploadFailed,
  cancelUploadSucceeded,
  editFileMetadataFailed,
  editFileMetadataSucceeded,
  initiateUpload,
  initiateUploadFailed,
  initiateUploadSucceeded,
  retryUpload,
  retryUploadFailed,
  retryUploadSucceeded,
  submitFileMetadataUpdate,
  uploadFailed,
  uploadSucceeded,
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
  startLoading,
  stopLoading,
  toggleFolderTree,
} from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

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
    it("adds GET_TEMPLATE to requestsInProgress if payload is not falsy", () => {
      const result = reducer(initialState, openTemplateEditor(1));
      expect(result.requestsInProgress).includes(AsyncRequest.GET_TEMPLATE);
    });
    it("does not add GET_TEMPLATE to requestsInProgress if payload is not defined", () => {
      const result = reducer(initialState, openTemplateEditor());
      expect(result.requestsInProgress).not.includes(AsyncRequest.GET_TEMPLATE);
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
    it("adds request in progress for GET_FILE_METADATA_FOR_JOB", () => {
      const result = reducer(
        initialState,
        openEditFileMetadataTab(mockSuccessfulUploadJob)
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.GET_FILE_METADATA_FOR_JOB
        )
      );
    });
  });
  describe("requestFileMetadataForJob", () => {
    it("adds request in progress for GET_FILE_METADATA_FOR_JOB", () => {
      const result = reducer(
        initialState,
        requestFileMetadataForJob(["jobId"])
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.GET_FILE_METADATA_FOR_JOB
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
    it("adds GET_FILE_METADATA_FOR_JOB to requestsInProgress", () => {
      const result = reducer(initialState, requestFileMetadataForJob(["abc"]));
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.GET_FILE_METADATA_FOR_JOB
        )
      ).to.be.true;
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
  describe("saveTemplateSucceeded", () => {
    it("removes SAVE_TEMPLATE from requestsInProgress, sets success alert, and closes template editor", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.SAVE_TEMPLATE],
          visibleModals: ["templateEditor"],
        },
        saveTemplateSucceeded(1)
      );
      expect(result.requestsInProgress).to.not.include(
        AsyncRequest.SAVE_TEMPLATE
      );
      expect(result.alert).to.deep.equal({
        message: "Template saved successfully!",
        type: AlertType.SUCCESS,
      });
      expect(result.visibleModals).to.not.include("templateEditor");
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
  describe("initiateUploadSucceeded", () => {
    it("removes INITIATE_UPLOAD-jobName from requestsInProgress and clears uploadError", () => {
      const result = reducer(
        initialState,
        initiateUploadSucceeded("jobName", "jobId", [], "foo")
      );
      expect(result.requestsInProgress).to.not.include(
        "INITIATE_UPLOAD-jobName"
      );
      expect(result.uploadError).to.be.undefined;
    });
  });
  describe("initiateUploadFailed", () => {
    it("removes INITIATE_UPLOAD-jobName from requestsInProgress and sets upload error", () => {
      const result = reducer(
        initialState,
        initiateUploadFailed("jobName", "some error")
      );
      expect(result.requestsInProgress).to.not.include(
        "INITIATE_UPLOAD-jobName"
      );
      expect(result.uploadError).to.equal("some error");
    });
  });
  describe("uploadSucceeded", () => {
    it("sets success alert", () => {
      const result = reducer(
        initialState,
        uploadSucceeded("jobName", "jobId", ["jobId"])
      );
      expect(result.alert).to.deep.equal({
        message: "Upload jobName succeeded!",
        type: AlertType.SUCCESS,
      });
    });
  });
  describe("uploadFailed", () => {
    it("sets error alert", () => {
      const result = reducer(
        initialState,
        uploadFailed("error", "jobName", "jobId", ["jobId"])
      );
      expect(result.alert).to.deep.equal({
        message: "error",
        type: AlertType.ERROR,
      });
    });
  });
  describe("retryUpload", () => {
    it("adds RETRY_UPLOAD to requestsInProgress and sets info alert", () => {
      const result = reducer(
        initialState,
        retryUpload(
          {
            ...mockFailedUploadJob,
            key: "something",
          },
          []
        )
      );
      expect(result.requestsInProgress).includes(
        `${AsyncRequest.RETRY_UPLOAD}-${mockFailedUploadJob.jobName}`
      );
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
        retryUploadSucceeded(
          { ...mockSuccessfulUploadJob, jobId: "foo", key: "cat" },
          ["foo"]
        )
      );
      expect(
        result.requestsInProgress.includes(`${AsyncRequest.RETRY_UPLOAD}-foo`)
      ).to.be.false;
      expect(result.alert).to.deep.equal({
        message: "Retry upload mockJob1 succeeded!",
        type: AlertType.SUCCESS,
      });
    });
  });
  describe("retryUploadFailed", () => {
    it("removes RETRY_UPLOAD from requestsInProgress and sets error alert", () => {
      const requestType = `${AsyncRequest.RETRY_UPLOAD}-jobName`;
      const result = reducer(
        { ...initialState, requestsInProgress: [requestType] },
        retryUploadFailed(
          {
            ...mockFailedUploadJob,
            jobId: "foo",
            jobName: "jobName",
            key: "cat",
          },
          "error",
          ["foo"]
        )
      );
      expect(result.requestsInProgress.includes(requestType)).to.be.false;
      expect(result.alert).to.deep.equal({
        message: "error",
        type: AlertType.ERROR,
      });
    });
  });
  describe("cancelUpload", () => {
    it("adds CANCEL_UPLOAD-jobName to requestsInProgress and sets info alert", () => {
      const requestType = `${AsyncRequest.CANCEL_UPLOAD}-foo`;
      const result = reducer(
        initialState,
        cancelUpload({ ...mockSuccessfulUploadJob, jobId: "foo", key: "cat" }, [
          "foo",
        ])
      );
      expect(result.requestsInProgress.includes(requestType));
      expect(result.alert).to.deep.equal({
        message: "Cancelling upload mockJob1",
        type: AlertType.INFO,
      });
    });
  });
  describe("cancelUploadSucceeded", () => {
    it("removes CANCEL_UPLOAD from requestsInProgress and sets success alert", () => {
      const requestType = `${AsyncRequest.CANCEL_UPLOAD}-foo`;
      const result = reducer(
        { ...initialState, requestsInProgress: [requestType] },
        cancelUploadSucceeded({
          ...mockSuccessfulUploadJob,
          jobName: "foo",
          key: "cat",
        })
      );
      expect(result.requestsInProgress.includes(requestType)).to.be.false;
      expect(result.alert).to.deep.equal({
        message: "Cancel upload foo succeeded",
        type: AlertType.SUCCESS,
      });
    });
  });
  describe("cancelUploadFailed", () => {
    it("removes CANCEL_UPLOAD from requestsInProgress and sets error alert", () => {
      const requestType = `${AsyncRequest.CANCEL_UPLOAD}-foo`;
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.CANCEL_UPLOAD] },
        cancelUploadFailed(
          { ...mockSuccessfulUploadJob, jobName: "foo", key: "cat" },
          "foo"
        )
      );
      expect(result.requestsInProgress.includes(requestType)).to.be.false;
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
  describe("startTemplateDraft", () => {
    it("removes GET_TEMPLATE from requestsInProgress", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_TEMPLATE],
        },
        startTemplateDraft(mockMMSTemplate, mockTemplateDraft, true)
      );
      expect(result.requestsInProgress).not.includes(AsyncRequest.GET_TEMPLATE);
    });
  });
  describe("startTemplateDraftFailed", () => {
    it("removes GET_TEMPLATE from requestsInProgress", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_TEMPLATE],
        },
        startTemplateDraftFailed("error")
      );
      expect(result.requestsInProgress).not.includes(AsyncRequest.GET_TEMPLATE);
    });
  });
  describe("submitFileMetadataUpdate", () => {
    it("adds AsyncRequest.UPDATE_FILE_METADATA-jobName to requestsInProgress", () => {
      const result = reducer(initialState, {
        ...submitFileMetadataUpdate(),
        payload: "jobName",
      });
      expect(result.requestsInProgress).to.include(
        `${AsyncRequest.UPDATE_FILE_METADATA}-jobName`
      );
    });
  });
  describe("editFileMetadataFailed", () => {
    it("sets error alert", () => {
      const result = reducer(
        initialState,
        editFileMetadataFailed("foo", "jobName")
      );
      expect(result.alert).to.deep.equal({
        message: "foo",
        type: AlertType.ERROR,
      });
    });
    it("removes UPDATE_FILE_METADATA-jobName from requestsInProgress", () => {
      const result = reducer(
        initialState,
        editFileMetadataFailed("foo", "jobName")
      );
      expect(
        result.requestsInProgress.includes(
          `${AsyncRequest.UPDATE_FILE_METADATA}-jobName`
        )
      ).to.be.false;
    });
  });
  describe("editFileMetadataSucceeded", () => {
    const jobName = "jobName";
    it("sets success alert", () => {
      const result = reducer(initialState, editFileMetadataSucceeded(jobName));
      expect(result.alert).to.deep.equal({
        message: "File metadata updated successfully!",
        type: AlertType.SUCCESS,
      });
    });
    it("removes UPDATE_FILE_METADATA from requestsInProgress", () => {
      const result = reducer(initialState, editFileMetadataSucceeded(jobName));
      expect(
        result.requestsInProgress.includes(
          `${AsyncRequest.UPDATE_FILE_METADATA}-${jobName}`
        )
      ).to.be.false;
    });
  });
  describe("openEditMetadataTabSucceeded", () => {
    it("removes GET_FILE_METADATA_FOR_JOB from requestsInProgress", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_FILE_METADATA_FOR_JOB],
        },
        openEditFileMetadataTabSucceeded(mockWellUpload)
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.GET_FILE_METADATA_FOR_JOB
        )
      ).to.be.false;
    });
  });
});
