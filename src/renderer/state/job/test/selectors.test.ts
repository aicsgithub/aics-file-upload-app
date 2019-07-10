import { expect } from "chai";

import { mockState, nonEmptyJobStateBranch } from "../../test/mocks";

import { getIsUnsafeToExit, getJobsForTable } from "../selectors";

describe("Job selectors", () => {
    describe("getJobsForTable", () => {
        it("converts jobs in redux store to objects used by upload summary page", () => {
            const jobs = nonEmptyJobStateBranch.uploadJobs;
            const jobTableRows = getJobsForTable({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });

            expect(jobTableRows.length).to.equal(jobs.length);
            for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                const jobTableRow = jobTableRows[i];
                expect(jobTableRow.jobName).to.equal(job.jobName);
                expect(jobTableRow.key).to.equal(job.jobId);
                expect(jobTableRow.stage).to.equal(job.currentStage);
                expect(jobTableRow.modified).to.equal(job.modified.toLocaleString());
            }
        });
    });

    describe("getIsUnsafeToExit", () => {
        it("returns true if there are any pending jobs", () => {
            const isUnsafeToExit = getIsUnsafeToExit({
                ...mockState,
                job: {...mockState.job, pendingJobs: ["job1"]},
            });
            expect(isUnsafeToExit).to.be.true;
        });

        it("returns true if an upload job is in progress and its copy job is in progress", () => {});
        it("returns false if an upload job is in failed and its copy job is in progress", () => {});
        it("returns false if an upload job is in progress and its copy job is in complete", () => {});
        it("returns false if an upload job is in progress and its copy job is in failed", () => {});
        it("returns false if an upload job is complete", () => {});
    });
});
