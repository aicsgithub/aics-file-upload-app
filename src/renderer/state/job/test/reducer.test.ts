import { expect } from "chai";

import {
  mockFailedCopyJob,
  mockFailedUploadJob,
  mockSuccessfulUploadJob,
  mockWorkingAddMetadataJob,
} from "../../test/mocks";
import { AsyncRequest, JobFilter } from "../../types";
import {
  cancelUpload,
  initiateUploadSucceeded,
  retryUpload,
  retryUploadFailed,
  retryUploadSucceeded,
  uploadFailed,
  uploadSucceeded,
} from "../../upload/actions";
import {
  receiveJobs,
  selectJobFilter,
  startJobPoll,
  stopJobPoll,
  updateIncompleteJobIds,
} from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

describe("job reducer", () => {
  describe("receiveJobs", () => {
    it("sets addMetadataJobs, copyJobs, incompleteJobIds, uploadJobs, and inProgressJobs", () => {
      const addMetadataJobs = [mockWorkingAddMetadataJob];
      const copyJobs = [mockFailedCopyJob];
      const incompleteJobIds = ["job1"];
      const uploadJobs = [mockSuccessfulUploadJob];
      const inProgressJobs = [mockWorkingAddMetadataJob];
      const result = reducer(
        initialState,
        receiveJobs(
          uploadJobs,
          copyJobs,
          addMetadataJobs,
          incompleteJobIds,
          inProgressJobs
        )
      );
      expect(result.addMetadataJobs).to.equal(addMetadataJobs);
      expect(result.copyJobs).to.equal(copyJobs);
      expect(result.incompleteJobIds).to.deep.equal(incompleteJobIds);
      expect(result.uploadJobs).to.equal(uploadJobs);
      expect(result.inProgressUploadJobs).to.equal(inProgressJobs);
    });
  });
  describe("updateIncompleteJobIds", () => {
    it("sets incompleteJobIds", () => {
      const jobIds = ["abc"];
      const result = reducer(initialState, updateIncompleteJobIds(jobIds));
      expect(result.incompleteJobIds).to.equal(jobIds);
    });
  });
  describe("selectJobFilter", () => {
    it("sets jobFilter", () => {
      const result = reducer(initialState, selectJobFilter(JobFilter.Failed));
      expect(result.jobFilter).to.equal(JobFilter.Failed);
    });
  });
  describe("startJobPoll", () => {
    it("sets polling to true", () => {
      const result = reducer(initialState, startJobPoll());
      expect(result.polling).to.be.true;
    });
  });
  describe("stopJobPoll", () => {
    it("sets polling to false", () => {
      const result = reducer({ ...initialState, polling: true }, stopJobPoll());
      expect(result.polling).to.be.false;
    });
  });
  describe("retryUpload", () => {
    it("sets incompleteJobIds and sets polling to true", () => {
      const result = reducer(
        initialState,
        retryUpload({ ...mockFailedUploadJob, key: "key" }, [])
      );
      expect(result.incompleteJobIds).to.include(mockFailedUploadJob.jobId);
      expect(result.polling).to.be.true;
    });
  });
  describe("retryUploadSucceeded", () => {
    it("sets incompleteJobIds", () => {
      const result = reducer(
        initialState,
        retryUploadSucceeded(
          { ...mockFailedUploadJob, jobId: "foo", key: "key" },
          ["foo"]
        )
      );
      expect(result.incompleteJobIds).to.not.include("foo");
    });
  });
  describe("retryUploadFailed", () => {
    it("sets incompleteJobIds", () => {
      const requestType = `${AsyncRequest.RETRY_UPLOAD}-jobName`;
      const result = reducer(
        { ...initialState, incompleteJobIds: ["foo"] },
        retryUploadFailed(
          {
            ...mockFailedUploadJob,
            jobId: "foo",
            jobName: "jobName",
            key: "key",
          },
          "error",
          [requestType]
        )
      );
      expect(result.incompleteJobIds).to.not.include("foo");
    });
  });
  describe("initiateUploadSucceeded", () => {
    it("sets incompleteJobIds", () => {
      const result = reducer(
        initialState,
        initiateUploadSucceeded("foo", "jobId", [])
      );
      expect(result.incompleteJobIds.length).to.equal(1);
    });
  });
  describe("uploadSucceeded", () => {
    it("sets incompleteJobIds", () => {
      const result = reducer(
        { ...initialState, incompleteJobIds: ["jobId"] },
        uploadSucceeded("foo", "jobId", [])
      );
      expect(result.incompleteJobIds).to.be.empty;
    });
  });
  describe("uploadFailed", () => {
    it("sets incompleteJobIds", () => {
      const result = reducer(
        { ...initialState, incompleteJobIds: ["jobId"] },
        uploadFailed("error", "foo", "jobId", [])
      );
      expect(result.incompleteJobIds).to.be.empty;
    });
  });
  describe("cancelUpload", () => {
    it("sets incompleteJobIds and sets polling to true", () => {
      const result = reducer(
        { ...initialState, incompleteJobIds: ["foo"] },
        cancelUpload({ ...mockFailedUploadJob, jobId: "foo", key: "bar" }, [
          "foo",
        ])
      );
      expect(result.incompleteJobIds).to.be.empty;
      expect(result.polling).to.be.true;
    });
  });
});
