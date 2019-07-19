import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { every, get, includes, orderBy, some } from "lodash";
import { createSelector } from "reselect";

import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { State } from "../types";
import { PendingJob } from "./types";

export const getCopyJobs = (state: State) => state.job.copyJobs;
export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getPendingJobs = (state: State) => state.job.pendingJobs;

export const getNumberOfPendingJobs = createSelector([getPendingJobs], (pendingJobs: PendingJob[]) => {
   return pendingJobs.length;
});

export const getPendingJobNames = createSelector([getPendingJobs], (jobs: PendingJob[]) => {
    return jobs.map((job) => job.jobName);
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

export const getJobsForTable = createSelector([
    getUploadJobsWithCopyJob,
    getPendingJobs,
], (uploadJobs: JSSJob[], pendingJobs: PendingJob[]): UploadSummaryTableRow[] => {
    return orderBy([...uploadJobs, ...pendingJobs], ["modified"], ["desc"])
        .map((job) => ({...job, key: job.jobId}));
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

export const getUploadJobNames = createSelector([
    getUploadJobs,
], (uploadJobs: JSSJob[]): string[] => {
    return uploadJobs
        .map((job) => job.jobName)
        .filter((name) => !!name) as string[];
    // typescript static analysis is unable to track the fact that undefined values should be filtered out
    // so we need to cast here.
    // https://codereview.stackexchange.com/questions/135363/filtering-undefined-elements-out-of-an-array
});

export const getAreAllJobsComplete = createSelector([
    getUploadJobs,
    getNumberOfPendingJobs,
], (uploadJobs: JSSJob[], pendingJobs: number) => {
    return pendingJobs === 0 && every(uploadJobs, (job: JSSJob) => !includes(IN_PROGRESS_STATUSES, job.status));
});
