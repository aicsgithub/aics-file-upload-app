import { expect } from "chai";

import { WELL_ANNOTATION_NAME } from "../../../constants";
import {
  JSSJob,
  JSSJobStatus,
} from "../../../services/job-status-client/types";
import {
  getMockStateWithHistory,
  mockFailedAddMetadataJob,
  mockFailedUploadJob,
  mockState,
  mockSuccessfulAddMetadataJob,
  mockSuccessfulUploadJob,
  mockWellUpload,
  mockWorkingAddMetadataJob,
  mockWorkingUploadJob,
  nonEmptyJobStateBranch,
} from "../../test/mocks";
import { AsyncRequest, JobFilter, State } from "../../types";
import {
  getCurrentJobName,
  getFilteredJobs,
  getIsSafeToExit,
  getJobIdToAddMetadataJobMap,
  getJobIdToUploadJobMap,
  getJobsForTable,
  getUploadInProgress,
} from "../selectors";

describe("Job selectors", () => {
  describe("getJobsForTable", () => {
    it("converts jobs in redux store to objects used by upload summary page", () => {
      const jobs = [...nonEmptyJobStateBranch.uploadJobs];
      const jobTableRows = getJobsForTable({
        ...mockState,
        job: {
          ...nonEmptyJobStateBranch,
          copyProgress: {
            [mockWorkingUploadJob.jobId]: {
              completedBytes: 2,
              totalBytes: 100,
            },
          },
        },
      });

      expect(jobTableRows.length).to.equal(jobs.length);
      let foundWorkingJob = false;
      jobTableRows.forEach((jobTableRow) => {
        const match = jobs.find((job) => {
          return (
            job.jobName === jobTableRow.jobName &&
            job.jobId === jobTableRow.key &&
            job.currentStage === jobTableRow.currentStage &&
            job.status === jobTableRow.status
          );
        });
        if (jobTableRow.status === JSSJobStatus.WORKING) {
          expect(jobTableRow.progress).to.not.be.undefined;
          foundWorkingJob = true;
        }
        expect(match).to.not.be.undefined;
      });
      expect(foundWorkingJob).to.be.true;
    });
  });

  describe("getIsSafeToExit", () => {
    it("returns true if no jobs", () => {
      const isSafeToExit = getIsSafeToExit(mockState);
      expect(isSafeToExit).to.be.true;
    });

    it("returns true if addMetadataJobs only contains a successful job", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          addMetadataJobs: [
            {
              ...mockSuccessfulAddMetadataJob,
              parentId: mockWorkingUploadJob.jobId,
            },
          ],
        },
      });
      expect(isSafeToExit).to.be.true;
    });

    it("returns true if addMetadataJobs only contains a failed job", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          addMetadataJobs: [
            {
              ...mockFailedAddMetadataJob,
              parentId: mockWorkingUploadJob.jobId,
            },
          ],
        },
      });
      expect(isSafeToExit).to.be.true;
    });

    it("returns addMetadataJobs contains a working job", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          addMetadataJobs: [
            {
              ...mockWorkingAddMetadataJob,
              parentId: mockWorkingUploadJob.jobId,
            },
          ],
        },
      });
      expect(isSafeToExit).to.be.false;
    });
  });

  describe("getCurrentJobName", () => {
    it("returns undefined if upload is empty", () => {
      const name = getCurrentJobName({
        ...mockState,
        upload: getMockStateWithHistory({}),
      });
      expect(name).to.be.undefined;
    });
    it("returns name of current upload filepath if already saved", () => {
      const name = getCurrentJobName({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          currentUploadFilePath: "/foo/bar/lisas-first-upload.json",
        },
        upload: getMockStateWithHistory({
          foo: {
            barcode: "1234",
            file: "/path",
            [WELL_ANNOTATION_NAME]: [1, 2],
          },
        }),
      });
      expect(name).to.equal(`lisas-first-upload`);
    });
    it("returns names of files and created date if not saved", () => {
      const name = getCurrentJobName({
        ...mockState,
        upload: getMockStateWithHistory({
          bar: {
            barcode: "1234",
            file: "bar",
            [WELL_ANNOTATION_NAME]: [1, 2],
          },
          foo: {
            barcode: "1234",
            file: "foo",
            [WELL_ANNOTATION_NAME]: [1, 2],
          },
        }),
      });
      expect(name).to.not.be.undefined;
      if (name) {
        expect(name.includes("bar, foo")).to.be.true;
      }
    });
  });
  describe("getUploadInProgress", () => {
    it("returns false if requestsInProgress does not contain INITIATE_UPLOAD-currentUploadName", () => {
      const inProgress = getUploadInProgress(mockState);
      expect(inProgress).to.be.false;
    });
    it("returns true if requestsInProgress contains INITIATE_UPLOAD-currentUploadName", () => {
      const currentJobName = `foo`;
      const inProgress = getUploadInProgress({
        ...mockState,
        feedback: {
          ...mockState.feedback,
          requestsInProgress: [
            `${AsyncRequest.INITIATE_UPLOAD}-${currentJobName}`,
          ],
        },
        metadata: {
          ...mockState.metadata,
          currentUploadFilePath: "/path/foo.json",
        },
        upload: getMockStateWithHistory(mockWellUpload),
      });
      expect(inProgress).to.be.true;
    });
    it("returns false if requestsInProgress contains request belonging to a different upload", () => {
      const inProgress = getUploadInProgress({
        ...mockState,
        feedback: {
          ...mockState.feedback,
          requestsInProgress: [`${AsyncRequest.INITIATE_UPLOAD}-bar`],
        },
        metadata: {
          ...mockState.metadata,
          currentUploadFilePath: "/path/foo.json",
        },
        upload: getMockStateWithHistory({
          foo: {
            barcode: "1234",
            file: "foo",
            [WELL_ANNOTATION_NAME]: [1],
          },
        }),
      });
      expect(inProgress).to.be.false;
    });
  });
  describe("getFilteredJobs", () => {
    let state: State;
    let mockRetryingUploadJob: JSSJob,
      mockUnrecoverableUploadJob: JSSJob,
      mockBlockedUploadJob: JSSJob;
    beforeEach(() => {
      mockRetryingUploadJob = {
        ...mockWorkingUploadJob,
        status: JSSJobStatus.RETRYING,
      };
      mockUnrecoverableUploadJob = {
        ...mockFailedUploadJob,
        status: JSSJobStatus.UNRECOVERABLE,
      };
      mockBlockedUploadJob = {
        ...mockFailedUploadJob,
        status: JSSJobStatus.BLOCKED,
      };
      state = {
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [
            mockWorkingUploadJob,
            mockSuccessfulUploadJob,
            mockFailedUploadJob,
            mockRetryingUploadJob,
            mockUnrecoverableUploadJob,
            mockBlockedUploadJob,
          ],
        },
      };
    });
    it("returns succeeded jobs if succeeded job filter selected", () => {
      const jobs = getFilteredJobs({
        ...state,
        job: {
          ...state.job,
          jobFilter: JobFilter.Successful,
        },
      });
      expect(jobs).to.deep.equal([mockSuccessfulUploadJob]);
    });
    it("returns failed and unrecoverable jobs if failed job filter selected", () => {
      const jobs = getFilteredJobs({
        ...state,
        job: {
          ...state.job,
          jobFilter: JobFilter.Failed,
        },
      });
      expect(jobs).to.deep.equal([
        mockFailedUploadJob,
        mockUnrecoverableUploadJob,
      ]);
    });
    it("returns working and retrying jobs if in progress job filter selected", () => {
      const jobs = getFilteredJobs({
        ...state,
        job: {
          ...state.job,
          jobFilter: JobFilter.InProgress,
        },
      });
      expect(jobs).to.deep.equal([
        mockWorkingUploadJob,
        mockRetryingUploadJob,
        mockBlockedUploadJob,
      ]);
    });
    it("does not filter out any jobs if All job filter selected", () => {
      const jobs = getFilteredJobs({
        ...state,
        job: {
          ...state.job,
          jobFilter: JobFilter.All,
        },
      });
      expect(jobs).to.deep.equal(state.job.uploadJobs);
    });
  });
  describe("getJobIdToUploadJobMap", () => {
    it("converts a list of jobs to a map of jobId's to jobs", () => {
      const map = getJobIdToUploadJobMap({
        ...mockState.job,
        uploadJobs: [mockWorkingUploadJob, mockSuccessfulUploadJob],
      });
      expect(map.size).to.equal(2);
      expect(map.get(mockWorkingUploadJob.jobId)).to.equal(
        mockWorkingUploadJob
      );
      expect(map.get(mockSuccessfulUploadJob.jobId)).to.equal(
        mockSuccessfulUploadJob
      );
    });
  });
  describe("getJobIdToAddMetadataJobMap", () => {
    it("converts a list of jobs to a map of jobId's to jobs", () => {
      const map = getJobIdToAddMetadataJobMap({
        ...mockState.job,
        addMetadataJobs: [mockWorkingAddMetadataJob, mockFailedAddMetadataJob],
      });
      expect(map.size).to.equal(2);
      expect(map.get(mockWorkingAddMetadataJob.jobId)).to.equal(
        mockWorkingAddMetadataJob
      );
      expect(map.get(mockFailedAddMetadataJob.jobId)).to.equal(
        mockFailedAddMetadataJob
      );
    });
  });
});
