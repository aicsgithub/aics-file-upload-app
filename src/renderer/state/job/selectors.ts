import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { get, orderBy, some } from "lodash";
import { createSelector } from "reselect";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { State } from "../types";

export const getCopyJobs = (state: State) => state.job.copyJobs;
export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getPendingJobs = (state: State) => state.job.pendingJobs;

export const getNumberOfPendingJobs = createSelector([getPendingJobs], (pendingJobs: string[]) => {
   return pendingJobs.length;
});

export const getUploadJobsWithCopyJob = createSelector([
    getCopyJobs,
    getUploadJobs,
], (copyJobs: JSSJob[], uploadJobs: JSSJob[]) => {
   return uploadJobs.map((j) => {
       return {
           ...j,
           serviceFields: {
               ...j.serviceFields,
               copyJob: copyJobs.find((cj) => cj.jobId === get(j, ["serviceFields", "copyJobId"])),
           },
       };
   });
});
export const getJobsForTable = createSelector([
    getUploadJobsWithCopyJob,
], (uploadJobs: JSSJob[]): UploadSummaryTableRow[] => {
    return orderBy(uploadJobs.map(({modified, currentStage, jobName, jobId, status}) => ({
        jobName: jobName || "",
        key: jobId,
        modified: modified.toLocaleString(),
        stage: currentStage || "",
        status,
    })), ["modified"], ["desc"]);
});

const IN_PROGRESS_STATUSES = ["WORKING", "RETRYING", "WAITING", "BLOCKED"];

export const getIsUnsafeToExit = createSelector([
    getUploadJobsWithCopyJob,
    getNumberOfPendingJobs,
], (jobs: JSSJob[], numberPendingJobs: number): boolean => {
    if (numberPendingJobs > 0) {
        return true;
    }

    return some(jobs, ({status, serviceFields}) => {
        const { copyJob } = serviceFields;
        return some(IN_PROGRESS_STATUSES, status) && some(IN_PROGRESS_STATUSES, copyJob.status);
    });
});
