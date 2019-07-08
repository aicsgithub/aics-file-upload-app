import { expect } from "chai";

import { mockState, nonEmptyJobStateBranch } from "../../test/mocks";

import { getJobsForTable } from "../selectors";

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
                expect(jobTableRow.jobId).to.equal(job.jobId);
                expect(jobTableRow.key).to.equal(job.jobId);
                expect(jobTableRow.stage).to.equal(job.currentStage);
                expect(jobTableRow.created).to.equal(job.created.toLocaleString());
            }
        });
    });

    describe("getIsUnsafeToExit", () => {
        // TODO
    });
});