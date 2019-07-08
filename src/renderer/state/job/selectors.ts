import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { orderBy } from "lodash";
import { createSelector } from "reselect";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { State } from "../types";

export const getUploadJobs = (state: State) => state.job.uploadJobs;

export const getJobsForTable = createSelector([getUploadJobs], (jobs: JSSJob[]): UploadSummaryTableRow[] => {
    return orderBy(jobs.map(({created, currentStage, jobId}) => ({
        created: created.toLocaleString(),
        jobId,
        key: jobId,
        stage: currentStage || "",
    })), ["created"], ["desc"]);
});

export const getIsUnsafeToExit = createSelector([getUploadJobs], (jobs: JSSJob[]): boolean => {
    return false;
});
