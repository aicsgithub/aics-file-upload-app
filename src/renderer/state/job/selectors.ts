import { find, findIndex } from "lodash";
import { createSelector } from "reselect";

import { State } from "../types";
import { Job, JobSummaryTableRow } from "./types";

export const getJobs = (state: State) => state.job.jobs;
export const getCurrentJobId = (state: State) => state.job.currentJobId;

export const getCurrentJob = createSelector([
    getJobs,
    getCurrentJobId,
], (jobs: Job[], currentJobId?: string) => {
    return find(jobs, {jobId: currentJobId});
});

export const getCurrentJobIndex = createSelector([
    getJobs,
    getCurrentJobId,
], (jobs: Job[], currentJobId?: string) => {
    return findIndex(jobs, {jobId: currentJobId});
});

export const getJobsForTable = createSelector([getJobs], (jobs: Job[]): JobSummaryTableRow[] => {
    return jobs.map((job) => ({
        ...job,
        created: job.created.toDateString(),
    }));
});
