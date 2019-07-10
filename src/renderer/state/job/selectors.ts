import { JSSJob, JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { get, includes, orderBy, some } from "lodash";
import { createSelector } from "reselect";
import { StatusCircleClassName, UploadSummaryTableRow } from "../../containers/UploadSummary";

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

const IN_PROGRESS_STATUSES = ["WORKING", "RETRYING", "WAITING", "BLOCKED"];
const SUCCESS_STATUSES = ["SUCCEEDED"];
const ERROR_STATUSES = [ "FAILED", "UNRECOVERABLE" ];

const getStatusCircleClassName = (status: JSSJobStatus): StatusCircleClassName | undefined => {
    if (includes(IN_PROGRESS_STATUSES, status)) {
        return "inProgress";
    }

    if (includes(SUCCESS_STATUSES, status)) {
        return "success";
    }

    if (includes(ERROR_STATUSES, status)) {
        return "error";
    }

    return undefined;
};

export const getJobsForTable = createSelector([
    getUploadJobsWithCopyJob,
], (uploadJobs: JSSJob[]): UploadSummaryTableRow[] => {
    const orderedJobs = orderBy(uploadJobs, ["modified"], ["desc"]);
    return orderedJobs.map(({modified, currentStage, jobName, jobId, status}) => ({
        jobName: jobName || "",
        key: jobId,
        modified: modified.toLocaleString(),
        stage: currentStage || "",
        status,
        statusCircleClassName: getStatusCircleClassName(status),
    }));
});

export const getIsUnsafeToExit = createSelector([
    getUploadJobsWithCopyJob,
    getNumberOfPendingJobs,
], (jobs: JSSJob[], numberPendingJobs: number): boolean => {
    if (numberPendingJobs > 0) {
        return true;
    }

    return some(jobs, ({status, serviceFields}) => {
        const { copyJob } = serviceFields;
        if (!copyJob) {
            return false;
        }

        const uploadInProgress = includes(IN_PROGRESS_STATUSES, status);
        const copyInProgress = includes(IN_PROGRESS_STATUSES, copyJob.status);
        return uploadInProgress && copyInProgress;
    });
});
