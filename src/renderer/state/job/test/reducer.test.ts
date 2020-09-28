import { expect } from "chai";

import {
  mockSuccessfulUploadJob,
  mockWorkingAddMetadataJob,
} from "../../test/mocks";
import { JobFilter } from "../../types";
import {
  receiveJobs,
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
