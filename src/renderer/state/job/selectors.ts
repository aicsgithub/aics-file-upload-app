import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { get, orderBy } from "lodash";
import { createSelector } from "reselect";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { State } from "../types";

export const getCopyJobs = (state: State) => state.job.copyJobs;
export const getUploadJobs = (state: State) => state.job.uploadJobs;

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

export const getIsUnsafeToExit = createSelector([getUploadJobs], (jobs: JSSJob[]): boolean => {
    return false;
});
