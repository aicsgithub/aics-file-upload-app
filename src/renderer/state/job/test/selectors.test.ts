import { expect } from "chai";

import { mockJob, mockJob2, mockState, nonEmptyJobStateBranch } from "../../test/mocks";

import { getCurrentJob, getCurrentJobIndex, getJobsForTable } from "../selectors";

describe("Job selectors", () => {
    describe("getCurrentJob", () => {
        it("returns job if a currentJobId is defined", () => {
            const currentJob = getCurrentJob({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });
            expect(currentJob).to.not.be.undefined;

            if (currentJob) {
                expect(currentJob.jobId).to.equal(mockJob.jobId);
            }
        });

        it("returns undefined if a currentJobId is defined but doesn't exist in jobs", () => {
            const currentJob = getCurrentJob({
                ...mockState,
                job: {
                    ...mockState.job,
                    currentJobId: mockJob.jobId,
                },
            });
            expect(currentJob).to.be.undefined;
        });

        it ("returns undefined if currentJobId is undefined", () => {
            const currentJob = getCurrentJob(mockState);
            expect(currentJob).to.be.undefined;
        });
    });

    describe("getCurrentJobIndex", () => {
        it("finds index of job with matching jobId", () => {
            const index = getCurrentJobIndex({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });
            expect(index).to.equal(1);
        });

        it("returns -1 if a currentJobId is defined but doesn't exist in jobs", () => {
            const index = getCurrentJobIndex({
                ...mockState,
                job: {
                    ...mockState.job,
                    currentJobId: mockJob.jobId,
                },
            });
            expect(index).to.equal(-1);
        });

        it("returns -1 if currentJobId is undefined", () => {
            const index = getCurrentJobIndex(mockState);
            expect(index).to.equal(-1);
        });
    });

    describe("getJobsForTable", () => {
        it("converts jobs in redux store to objects used by upload summary page", () => {
            const rawJobs = [mockJob2, mockJob];
            const jobs = getJobsForTable({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });

            expect(jobs.length).to.equal(rawJobs.length);
            for (let i = 0; i < jobs.length; i++) {
                const rawJob = rawJobs[i];
                const job = jobs[i];
                expect(job.jobId).to.equal(rawJob.jobId);
                expect(job.key).to.equal(rawJob.jobId);
                expect(job.status).to.equal(rawJob.status);
                expect(job.created).to.equal(rawJob.created.toLocaleString());
            }
        });
    });
});
