import { expect } from "chai";

import { JSSJobStatus } from "../../../services/job-status-client/types";
import {
  mockSuccessfulUploadJob,
  mockWorkingAddMetadataJob,
  mockWorkingUploadJob,
} from "../../test/mocks";
import { JobFilter } from "../../types";
import {
  receiveJobInsert,
  receiveJobs,
  receiveJobUpdate,
  selectJobFilter,
  updateUploadProgressInfo,
} from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

describe("job reducer", () => {
  describe("receiveJobs", () => {
    it("sets addMetadataJobs and uploadJobs", () => {
      const addMetadataJobs = [mockWorkingAddMetadataJob];
      const uploadJobs = [mockSuccessfulUploadJob];
      const result = reducer(
        initialState,
        receiveJobs(uploadJobs, addMetadataJobs)
      );
      expect(result.addMetadataJobs).to.equal(addMetadataJobs);
      expect(result.uploadJobs).to.equal(uploadJobs);
    });
  });
  describe("receiveJobInsert", () => {
    it("adds job to front of upload job list if serviceFields.type = 'upload'", () => {
      const result = reducer(
        initialState,
        receiveJobInsert(mockWorkingUploadJob)
      );
      expect(result.uploadJobs[0]).to.equal(mockWorkingUploadJob);
    });
    it("adds job to front of add metadata job list if serviceFields.type = 'add_metadata'", () => {
      const result = reducer(
        initialState,
        receiveJobInsert(mockWorkingAddMetadataJob)
      );
      expect(result.addMetadataJobs[0]).to.equal(mockWorkingAddMetadataJob);
    });
    it("returns original state if serviceFields.type != 'upload' and != 'add_metadata'", () => {
      const result = reducer(
        initialState,
        receiveJobInsert({
          ...mockWorkingAddMetadataJob,
          serviceFields: { type: "copy" },
        })
      );
      expect(result).to.equal(initialState);
    });
  });
  describe("receiveJobUpdate", () => {
    it("replaces job with matching jobId in uploadJobs if serviceFields.type = 'upload", () => {
      const updatedJob = {
        ...mockWorkingUploadJob,
        status: JSSJobStatus.SUCCEEDED,
      };
      const result = reducer(
        {
          ...initialState,
          uploadJobs: [mockWorkingUploadJob, mockSuccessfulUploadJob],
        },
        receiveJobUpdate(updatedJob)
      );
      expect(result.uploadJobs[0]).to.equal(updatedJob);
    });
    it("replaces job with matching jobId in uploadJobs if serviceFields.type = 'add-metadata", () => {
      const updatedJob = {
        ...mockWorkingAddMetadataJob,
        status: JSSJobStatus.SUCCEEDED,
      };
      const result = reducer(
        {
          ...initialState,
          addMetadataJobs: [mockWorkingAddMetadataJob],
        },
        receiveJobUpdate(updatedJob)
      );
      expect(result.addMetadataJobs[0]).to.equal(updatedJob);
    });
    it("returns original state if job with matching jobId is not found", () => {
      const updatedJob = {
        ...mockWorkingAddMetadataJob,
        jobId: "test",
        status: JSSJobStatus.SUCCEEDED,
      };
      const state = {
        ...initialState,
        addMetadataJobs: [mockWorkingAddMetadataJob],
      };
      const result = reducer(state, receiveJobUpdate(updatedJob));
      expect(result).to.equal(state);
    });
  });
  describe("selectJobFilter", () => {
    it("sets jobFilter", () => {
      const result = reducer(initialState, selectJobFilter(JobFilter.Failed));
      expect(result.jobFilter).to.equal(JobFilter.Failed);
    });
  });
  describe("updateUploadProgressInfo", () => {
    it("adds progress info for a jobId without overwriting other progress info", () => {
      const newProgress = { completedBytes: 1, totalBytes: 2 };
      const result = reducer(
        {
          ...initialState,
          copyProgress: { abc: { completedBytes: 0, totalBytes: 100 } },
        },
        updateUploadProgressInfo("def", newProgress)
      );
      expect(result.copyProgress.abc).to.not.be.undefined;
      expect(result.copyProgress.def).to.equal(newProgress);
    });
  });
});
