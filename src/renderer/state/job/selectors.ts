import { find, findIndex } from "lodash";
import { createSelector } from "reselect";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { State } from "../types";
import { Job } from "./types";

export const getJobs = (state: State) => state.job.jobs;
export const getCurrentJobName = (state: State) => state.job.currentJobName;

export const getCurrentJob = createSelector([
    getJobs,
    getCurrentJobName,
], (jobs: Job[], currentJobName?: string) => {
    return find(jobs, {name: currentJobName});
});

export const getCurrentJobIndex = createSelector([
    getJobs,
    getCurrentJobName,
], (jobs: Job[], currentJobName?: string) => {
    return findIndex(jobs, {name: currentJobName});
});

export const getJobsForTable = createSelector([getJobs], (jobs: Job[]): UploadSummaryTableRow[] => {
    return jobs.map((job) => ({
        ...job,
        created: job.created.toLocaleString(),
        key: job.jobId,
    }));
});
