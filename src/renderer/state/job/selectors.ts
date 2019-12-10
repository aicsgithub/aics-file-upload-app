import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { every, get, includes, orderBy } from "lodash";
import { createSelector } from "reselect";

import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { IN_PROGRESS_STATUSES } from "../constants";
import { State } from "../types";
import { PendingJob } from "./types";

export const getCopyJobs = (state: State) => state.job.copyJobs;
export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getPendingJobs = (state: State) => state.job.pendingJobs;
export const getAddMetadataJobs = (state: State) => state.job.addMetadataJobs;
export const getJobFilter = (state: State) => state.job.jobFilter;

export const getNumberOfPendingJobs = createSelector([getPendingJobs], (pendingJobs: PendingJob[]) => {
   return pendingJobs.length;
});

export const getPendingJobNames = createSelector([getPendingJobs], (jobs: PendingJob[]) => {
    return jobs.map((job) => job.jobName);
});

export const getUploadJobsWithChildJobs = createSelector([
    getCopyJobs,
    getAddMetadataJobs,
    getUploadJobs,
], (copyJobs: JSSJob[], addMetadataJobs: JSSJob[], uploadJobs: JSSJob[]) => {
   return uploadJobs.map((j) => {
       return {
           ...j,
           serviceFields: {
               ...j.serviceFields,
               addMetadataJob: addMetadataJobs.find(({ parentId }) => parentId === j.jobId),
               copyJob: copyJobs.find((cj) => cj.jobId === get(j, ["serviceFields", "copyJobId"])),
           },
       };
   });
});

export const getJobsForTable = createSelector([
    getUploadJobsWithChildJobs,
    getPendingJobs,
], (uploadJobs: JSSJob[], pendingJobs: PendingJob[]): UploadSummaryTableRow[] => {
    return orderBy([...uploadJobs, ...pendingJobs], ["modified"], ["desc"])
        .map((job) => ({...job, key: job.jobId}));
});

// The app is only safe to exit after either fss completes or after the add metadata step has been sent off
export const getIsSafeToExit = createSelector([
    getUploadJobsWithChildJobs,
    getNumberOfPendingJobs,
], (jobs: JSSJob[], numberPendingJobs: number): boolean => (
    numberPendingJobs === 0 && every(jobs, ({ serviceFields: { addMetadataJob }, status }) => (
        !includes(IN_PROGRESS_STATUSES, status)
        || (addMetadataJob && !includes(IN_PROGRESS_STATUSES, addMetadataJob.status))
    ))
));

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
