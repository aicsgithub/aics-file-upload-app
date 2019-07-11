import { expect } from "chai";

import {
    mockFailedCopyJob,
    mockFailedUploadJob, mockPendingJob,
    mockState, mockSuccessfulCopyJob, mockSuccessfulUploadJob,
    mockWorkingCopyJob,
    mockWorkingUploadJob,
    nonEmptyJobStateBranch,
} from "../../test/mocks";

import { getIsUnsafeToExit, getJobsForTable, getStatusCircleClassName } from "../selectors";

describe("Job selectors", () => {
    describe("getJobsForTable", () => {
        it("converts jobs in redux store to objects used by upload summary page", () => {
            const jobs = nonEmptyJobStateBranch.uploadJobs;
            const jobTableRows = getJobsForTable({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });

            expect(jobTableRows.length).to.equal(jobs.length + nonEmptyJobStateBranch.pendingJobs.length);
            for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                const jobTableRow = jobTableRows[i];
                expect(jobTableRow.jobName).to.equal(job.jobName);
                expect(jobTableRow.key).to.equal(job.jobId);
                expect(jobTableRow.stage).to.equal(job.currentStage);
                expect(jobTableRow.status).to.equal(job.status);
                expect(jobTableRow.statusCircleClassName).to.equal(getStatusCircleClassName(job.status));
                expect(jobTableRow.modified).to.equal(job.modified.toLocaleString());
            }
        });
    });

    describe("getIsUnsafeToExit", () => {
        it("returns true if there are any pending jobs", () => {
            const isUnsafeToExit = getIsUnsafeToExit({
                ...mockState,
                job: {...mockState.job, pendingJobs: [mockPendingJob]},
            });
            expect(isUnsafeToExit).to.be.true;
        });

        it("returns true if an upload job is in progress and its copy job is in progress", () => {
            const isUnsafeToExit = getIsUnsafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    copyJobs: [mockWorkingCopyJob],
                    uploadJobs: [mockWorkingUploadJob],
                },
            });
            expect(isUnsafeToExit).to.be.true;
        });

        it("returns false if an upload job is failed and its copy job is in progress", () => {
            const isUnsafeToExit = getIsUnsafeToExit({
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
            expect(isUnsafeToExit).to.be.false;
        });

        it("returns false if an upload job is in progress and its copy job is in complete", () => {
            const isUnsafeToExit = getIsUnsafeToExit({
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
            expect(isUnsafeToExit).to.be.false;
        });

        it("returns false if an upload job is in progress and its copy job is in failed", () => {
            const isUnsafeToExit = getIsUnsafeToExit({
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
            expect(isUnsafeToExit).to.be.false;
        });

        it("returns false if an upload job is complete", () => {
            const isUnsafeToExit = getIsUnsafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    copyJobs: [mockSuccessfulCopyJob],
                    uploadJobs: [mockSuccessfulUploadJob],
                },
            });
            expect(isUnsafeToExit).to.be.false;
        });
    });
});
