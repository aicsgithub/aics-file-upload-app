import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { orderBy } from "lodash";
import { createSelector } from "reselect";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { State } from "../types";

export const getJobs = (state: State) => state.job.uploadJobs;

export const getJobsForTable = createSelector([getJobs], (jobs: JSSJob[]): UploadSummaryTableRow[] => {
    return orderBy(jobs.map(({created, currentStage, jobId}) => ({
        created: created.toLocaleString(),
        jobId,
        key: jobId,
        stage: currentStage || "",
    })), ["created"], ["desc"]);
});

export const getIsUnsafeToExit = createSelector([getJobs], (jobs: JSSJob[]): boolean => {
    return false;
    // return some(jobs, (job) => !job.copyComplete && job.status === JobStatus.IN_PROGRESS);
});
