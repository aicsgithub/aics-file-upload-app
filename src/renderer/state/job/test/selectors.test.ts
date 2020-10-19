import { expect } from "chai";

import { WELL_ANNOTATION_NAME } from "../../../constants";
import { StepName } from "../../../services/aicsfiles/types";
import {
  JSSJob,
  JSSJobStatus,
} from "../../../services/job-status-client/types";
import {
  getMockStateWithHistory,
  mockFailedUploadJob,
  mockState,
  mockSuccessfulUploadJob,
  mockWellUpload,
  mockWorkingUploadJob,
  nonEmptyJobStateBranch,
} from "../../test/mocks";
import { AsyncRequest, JobFilter, State } from "../../types";
import {
  getCurrentJobName,
  getFilteredJobs,
  getIsSafeToExit,
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
    it("hides any jobs that are duplicates of the original and displays latest upload job", () => {
      const mockReplacementJob1 = {
        ...mockFailedUploadJob,
        created: new Date("Oct 2, 2020 03:24:00"),
        jobId: "replacement1",
      };
      const mockReplacementJob2 = {
        ...mockFailedUploadJob,
        created: new Date("Oct 3, 2020 03:24:00"),
        jobId: "replacement2",
        status: JSSJobStatus.RETRYING,
      };
      const rows = getJobsForTable({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [
            {
              ...mockFailedUploadJob,
              created: new Date("Oct 1, 2020 03:24:00"),
              serviceFields: {
                files: [],
                replacementJobIds: ["replacement1", "replacement2"],
                type: "upload",
                uploadDirectory: "/foo",
              },
            },
            mockReplacementJob1,
            mockReplacementJob2,
          ],
        },
      });
      expect(rows.length).to.equal(1);
      expect(rows[0].status).to.equal(JSSJobStatus.RETRYING);
      expect(rows[0].serviceFields).to.equal(mockReplacementJob2.serviceFields);
    });
  });

  describe("getIsSafeToExit", () => {
    it("returns true if no jobs", () => {
      const isSafeToExit = getIsSafeToExit(mockState);
      expect(isSafeToExit).to.be.true;
    });

    it("returns false if a upload job's current stage is at the add metadata step and is in progress", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [
            {
              ...mockWorkingUploadJob,
              currentStage: StepName.AddMetadata.toString(),
            },
          ],
        },
      });
      expect(isSafeToExit).to.be.false;
    });

    it("returns false if a upload job's current stage is at the copy files step and is in progress", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [
            {
              ...mockWorkingUploadJob,
              currentStage: StepName.CopyFiles.toString(),
            },
          ],
        },
      });
      expect(isSafeToExit).to.be.false;
    });

    it("returns false if a upload job's current stage is at the copy file step and is in progress", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [
            {
              ...mockWorkingUploadJob,
              currentStage: StepName.CopyFilesChild.toString(),
            },
          ],
        },
      });
      expect(isSafeToExit).to.be.false;
    });

    it("returns true if a upload job's current stage is not equal to any of the steps performed by this app", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [{ ...mockWorkingUploadJob, currentStage: "etl" }],
        },
      });
      expect(isSafeToExit).to.be.true;
    });

    it("returns true if there are no upload jobs", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [],
        },
      });
      expect(isSafeToExit).to.be.true;
    });
    it("returns true if there are no in progress jobs", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [mockFailedUploadJob, mockSuccessfulUploadJob],
        },
      });
      expect(isSafeToExit).to.be.true;
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
});
