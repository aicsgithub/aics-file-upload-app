import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { isEmpty, orderBy } from "lodash";
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

// todo: This is necessary for checking if the app is safe to exit. This isn't necessary if we store
// upload jobs by jobId rather than jobId. After we do this we should remove this and the query that populates it.
export const getInProgressUploadJobs = (state: State) => state.job.inProgressUploadJobs;

export const getNumberOfPendingJobs = createSelector([getPendingJobs], (pendingJobs: PendingJob[]) => {
   return pendingJobs.length;
});

export const getPendingJobNames = createSelector([getPendingJobs], (jobs: PendingJob[]) => {
    return jobs.map((job) => job.jobName);
});

export const getJobsForTable = createSelector([
    getUploadJobs,
    getPendingJobs,
], (uploadJobs: JSSJob[], pendingJobs: PendingJob[]): UploadSummaryTableRow[] => {
    return orderBy([...uploadJobs, ...pendingJobs], ["modified"], ["desc"]).map((job) => ({
        ...job,
        created: new Date(job.created),
        key: job.jobId,
        modified: new Date(job.modified),
    }));
});

// The app is only safe to exit after the add metadata step has been completed
// The add metadata step represents sending a request to FSS's /uploadComplete endpoint which delegates
// The last steps of the upload to FSS
// Since the add metadata step is a child of the upload job and does not get failed if the upload fails,
// We want to return false only if the parent upload job is in progress and the add metadata step is
// in progress.
export const getIsSafeToExit = createSelector([
    getIncompleteJobNames,
    getAddMetadataJobs,
    getNumberOfPendingJobs,
    getInProgressUploadJobs,
], (
    incompleteJobNames: string[],
    addMetadataJobs: JSSJob[],
    numberPendingJobs: number,
    inProgressUploadJobs: JSSJob[]
): boolean => {
    const incompleteAddMetadataJobs = addMetadataJobs.filter((addMetadataJob) => {
        const matchingUploadJob = inProgressUploadJobs.find((uploadJob) => uploadJob.jobId === addMetadataJob.parentId);
        if (!matchingUploadJob) {
            // If the parent upload job is not in progress, then this job is not counted
            return false;
        }
        return IN_PROGRESS_STATUSES.includes(addMetadataJob.status);
    });
    return numberPendingJobs === 0 && incompleteAddMetadataJobs.length === 0;
});

export const getAreAllJobsComplete = createSelector([
    getInProgressUploadJobs,
    getNumberOfPendingJobs,
], (inProgressUploadJobs: JSSJob[], pendingJobs: number) => {
    return pendingJobs === 0 && inProgressUploadJobs.length === 0;
});

export const getCurrentJobName = createSelector([
    getUpload,
    getUploadFileNames,
    getCurrentUpload,
], (upload: UploadStateBranch, fileNames: string, currentUpload?: CurrentUpload): string | undefined => {
    if (isEmpty(upload)) {
        return undefined;
    }
    const created = currentUpload ? moment(currentUpload.created).format(DATETIME_FORMAT) :
        moment().format(DATETIME_FORMAT);
    return currentUpload ? `${currentUpload.name} ${created}` :
        `${fileNames} ${created}`;
});

export const getCurrentJobIsIncomplete = createSelector([
    getIncompleteJobNames,
    getCurrentJobName,
], (incompleteJobNames: string[], currentJobName?: string): boolean => {
    return !!currentJobName && incompleteJobNames.includes(currentJobName);
});

export const getUploadInProgress = createSelector([
    getCurrentJobIsIncomplete,
    getPendingJobs,
    getCurrentJobName,
], (currentJobIsInProgress: boolean, pendingJobs: PendingJob[], currentJobName?: string): boolean => {
    if (!currentJobName) {
        return false;
    }
    return currentJobIsInProgress || !!pendingJobs.find((j: PendingJob) => j.jobName === currentJobName);
});
