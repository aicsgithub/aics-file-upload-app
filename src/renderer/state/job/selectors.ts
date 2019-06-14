import { some } from "lodash";
import { createSelector } from "reselect";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { State } from "../types";
import { Job, JobStatus } from "./types";

export const getJobs = (state: State) => state.job.jobs;

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
