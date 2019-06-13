import { find, findIndex, some } from "lodash";
import { createSelector } from "reselect";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { State } from "../types";
import { Job, JobStatus } from "./types";

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

export const getIsUnsafeToExit = createSelector([getJobs], (jobs: Job[]): boolean => {
    return some(jobs, (job) => !job.copyComplete && job.status === JobStatus.IN_PROGRESS);
});
