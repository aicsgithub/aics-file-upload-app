import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { every, get, includes, isEmpty, orderBy } from "lodash";
import * as moment from "moment";
import { createSelector } from "reselect";
import { DATETIME_FORMAT } from "../../constants";

import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { IN_PROGRESS_STATUSES } from "../constants";
import { getCurrentUpload } from "../metadata/selectors";
import { CurrentUpload } from "../metadata/types";
import { State } from "../types";
import { getUpload, getUploadFileNames } from "../upload/selectors";
import { UploadStateBranch } from "../upload/types";
import { PendingJob } from "./types";

export const getCopyJobs = (state: State) => state.job.copyJobs;
export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getPendingJobs = (state: State) => state.job.pendingJobs;
export const getAddMetadataJobs = (state: State) => state.job.addMetadataJobs;
export const getIncompleteJobNames = (state: State) => state.job.incompleteJobNames;
export const getJobFilter = (state: State) => state.job.jobFilter;
export const getIsPolling = (state: State) => state.job.polling;

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
    getUploadJobs,
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

export const getAreAllJobsComplete = createSelector([
    getUploadJobs,
    getNumberOfPendingJobs,
], (uploadJobs: JSSJob[], pendingJobs: number) => {
    return pendingJobs === 0 && every(uploadJobs, (job: JSSJob) => !includes(IN_PROGRESS_STATUSES, job.status));
});

export const getCurrentJobName = createSelector([
    getUpload,
    getUploadFileNames,
    getCurrentUpload,
], (upload: UploadStateBranch, fileNames: string, currentUpload?: CurrentUpload): string | undefined => {
    if (isEmpty(upload)) {
        return undefined;
    }
    return currentUpload ? `${currentUpload.name} ${currentUpload.created}` :
        `${fileNames} ${moment().format(DATETIME_FORMAT)}`;
});

export const getIncompleteJobNamesContainsCurrentJobName = createSelector([
    getIncompleteJobNames,
    getCurrentJobName,
], (incompleteJobNames: string[], currentJobName?: string): boolean => {
    return !!currentJobName && incompleteJobNames.includes(currentJobName);
});

export const getUploadInProgress = createSelector([
    getIncompleteJobNamesContainsCurrentJobName,
    getPendingJobs,
    getCurrentJobName,
], (currentJobIsPending: boolean, pendingJobs: PendingJob[], currentJobName?: string): boolean => {
    if (!currentJobName) {
        return false;
    }
    return currentJobIsPending || !!pendingJobs.find((j: PendingJob) => j.jobName === currentJobName);
});
