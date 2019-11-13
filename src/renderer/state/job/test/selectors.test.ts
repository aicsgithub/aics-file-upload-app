import { expect } from "chai";

import {
    mockBlockedUploadJob,
    mockFailedCopyJob,
    mockFailedUploadJob,
    mockPendingJob,
    mockRetryingUploadJob,
    mockState,
    mockSuccessfulCopyJob,
    mockSuccessfulUploadJob,
    mockUnrecoverableUploadJob,
    mockWaitingUploadJob,
    mockWorkingCopyJob,
    mockWorkingUploadJob,
    nonEmptyJobStateBranch,
} from "../../test/mocks";

import { getAreAllJobsComplete, getIsSafeToExit, getJobsForTable } from "../selectors";

describe("Job selectors", () => {
    describe("getJobsForTable", () => {
        it("converts jobs in redux store to objects used by upload summary page", () => {
            const jobs = [...nonEmptyJobStateBranch.uploadJobs, ...nonEmptyJobStateBranch.pendingJobs];
            const jobTableRows = getJobsForTable({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });

            expect(jobTableRows.length).to.equal(jobs.length);
            jobTableRows.forEach((jobTableRow) => {
                const match = jobs.find((job) => {
                    return job.jobName === jobTableRow.jobName &&
                        job.jobId === jobTableRow.key &&
                        job.currentStage === jobTableRow.currentStage &&
                        job.status === jobTableRow.status &&
                        job.modified === jobTableRow.modified;
                });
                expect(match).to.not.be.undefined;
            });
        });
    });

    describe("getIsSafeToExit", () => {
        it("returns true if no jobs", () => {
            const isSafeToExit = getIsSafeToExit(mockState);
            expect(isSafeToExit).to.be.true;
        });

        it("returns false if there are any pending jobs", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {...mockState.job, pendingJobs: [mockPendingJob]},
            });
            expect(isSafeToExit).to.be.false;
        });

        it("returns false if an upload job is in progress and its copy job is in progress", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    copyJobs: [mockWorkingCopyJob],
                    uploadJobs: [mockWorkingUploadJob],
                },
            });
            expect(isSafeToExit).to.be.false;
        });

        it("returns false if an upload job is failed and its copy job is in progress", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    copyJobs: [mockWorkingCopyJob],
                    uploadJobs: [{
                        ...mockFailedUploadJob,
                        serviceFields: {
                            ...mockFailedUploadJob.serviceFields,
                            copyJobId: mockWorkingCopyJob.jobId,
                        },
                    }],
                },
            });
            expect(isSafeToExit).to.be.false;
        });

        it("returns true if an upload job is in progress and its copy job is in complete", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    copyJobs: [mockSuccessfulCopyJob],
                    uploadJobs: [{
                        ...mockWorkingUploadJob,
                        serviceFields: {
                            ...mockWorkingUploadJob.serviceFields,
                            copyJobId: mockSuccessfulCopyJob.jobId,
                        },
                    }],
                },
            });
            expect(isSafeToExit).to.be.true;
        });

        it("returns true if an upload job is in progress and its copy job is failed", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    copyJobs: [mockFailedCopyJob],
                    uploadJobs: [{
                        ...mockFailedUploadJob,
                        serviceFields: {
                            ...mockFailedUploadJob.serviceFields,
                            copyJobId: mockFailedCopyJob.jobId,
                        },
                    }],
                },
            });
            expect(isSafeToExit).to.be.true;
        });

        it("returns true if an upload job is complete", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    copyJobs: [mockSuccessfulCopyJob],
                    uploadJobs: [mockSuccessfulUploadJob],
                },
            });
            expect(isSafeToExit).to.be.true;
        });
    });

    describe("getAreAllJobsComplete", () => {
        it("returns true if no jobs exist", () => {
            const complete = getAreAllJobsComplete(mockState);
            expect(complete).to.be.true;
        });

        it("returns false if pending jobs exist", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    pendingJobs: [mockPendingJob],
                    uploadJobs: [mockSuccessfulUploadJob, mockSuccessfulUploadJob, mockSuccessfulUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns false if an upload job is working", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockWorkingUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns false if an upload job is retrying", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockRetryingUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns false if an upload job is waiting", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockWaitingUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns false if an upload job is blocked", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockBlockedUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns true if all upload jobs succeeded", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockSuccessfulUploadJob],
                },
            });
            expect(complete).to.be.true;
        });

        it("returns true if all upload jobs failed", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockFailedUploadJob, mockFailedUploadJob],
                },
            });
            expect(complete).to.be.true;
        });

        it("returns true if upload jobs are unrecoverable", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockUnrecoverableUploadJob],
                },
            });
            expect(complete).to.be.true;
        });

        it("returns true if all upload jobs failed or succeeded or unrecoverable", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockFailedUploadJob, mockSuccessfulUploadJob, mockUnrecoverableUploadJob],
                },
            });
            expect(complete).to.be.true;
        });
    });
});
