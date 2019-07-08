// import { expect } from "chai";
//
// import { mockJob, mockJob2, mockState, nonEmptyJobStateBranch } from "../../test/mocks";
//
// import { getIsUnsafeToExit, getJobsForTable } from "../selectors";
// import { JobStatus } from "../types";
//
// describe("Job selectors", () => {
//     describe("getJobsForTable", () => {
//         it("converts jobs in redux store to objects used by upload summary page", () => {
//             const jobs = nonEmptyJobStateBranch.jobs;
//             const jobTableRows = getJobsForTable({
//                 ...mockState,
//                 job: {...nonEmptyJobStateBranch},
//             });
//
//             expect(jobTableRows.length).to.equal(jobs.length);
//             for (let i = 0; i < jobs.length; i++) {
//                 const job = jobs[i];
//                 const jobTableRow = jobTableRows[i];
//                 expect(jobTableRow.jobId).to.equal(job.jobId);
//                 expect(jobTableRow.key).to.equal(job.jobId);
//                 expect(jobTableRow.stage).to.equal(job.stage);
//                 expect(jobTableRow.created).to.equal(job.created.toLocaleString());
//             }
//         });
//     });
//
//     describe("getIsUnsafeToExit", () => {
//         it("returns true if at least one job is not done with copying and it is still in progress", () => {
//             const state = {
//                 ...mockState,
//                 job: {
//                     ...mockState.job,
//                     jobs: [mockJob, {...mockJob2, copyComplete: false, status: JobStatus.IN_PROGRESS}],
//                 },
//             };
//             const copyInProgress = getIsUnsafeToExit(state);
//             expect(copyInProgress).to.be.true;
//         });
//
//         it("returns false if all jobs are done with copying", () => {
//             const state = {
//                 ...mockState,
//                 job: {
//                     ...mockState.job,
//                     jobs: [mockJob, mockJob2],
//                 },
//             };
//             const copyInProgress = getIsUnsafeToExit(state);
//             expect(copyInProgress).to.be.false;
//         });
//
//         it("returns false if a job failed before copy completed", () => {
//             const state = {
//                 ...mockState,
//                 job: {
//                     ...mockState.job,
//                     jobs: [mockJob, {...mockJob2, copyComplete: false, status: JobStatus.FAILED}],
//                 },
//             };
//             const copyInProgress = getIsUnsafeToExit(state);
//             expect(copyInProgress).to.be.false;
//         });
//     });
// });
