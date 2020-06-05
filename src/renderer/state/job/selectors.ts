import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { isEmpty, orderBy } from "lodash";
import { createSelector } from "reselect";

import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { IN_PROGRESS_STATUSES } from "../constants";
import { getRequestsInProgress } from "../feedback/selectors";
import { AsyncRequest } from "../feedback/types";
import { getCurrentUploadFilePath } from "../metadata/selectors";
import { State } from "../types";
import { getUpload, getUploadFileNames } from "../upload/selectors";
import { UploadStateBranch } from "../upload/types";

export const getCopyJobs = (state: State) => state.job.copyJobs;
export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getAddMetadataJobs = (state: State) => state.job.addMetadataJobs;
export const getIncompleteJobIds = (state: State) => state.job.incompleteJobIds;
export const getJobFilter = (state: State) => state.job.jobFilter;
export const getIsPolling = (state: State) => state.job.polling;

export const getInProgressUploadJobs = (state: State) =>
  state.job.inProgressUploadJobs;

export const getJobsForTable = createSelector(
  [getUploadJobs],
  (uploadJobs: JSSJob[]): UploadSummaryTableRow[] => {
    return orderBy(uploadJobs, ["modified"], ["desc"]).map((job) => ({
      ...job,
      created: new Date(job.created),
      key: job.jobId,
      modified: new Date(job.modified),
    }));
  }
);

// The app is only safe to exit after the add metadata step has been completed
// The add metadata step represents sending a request to FSS's /uploadComplete endpoint which delegates
// The last steps of the upload to FSS
// Since the add metadata step is a child of the upload job and does not get failed if the upload fails,
// We want to return false only if the parent upload job is in progress and the add metadata step is
// in progress.
export const getIsSafeToExit = createSelector(
  [getAddMetadataJobs, getInProgressUploadJobs],
  (addMetadataJobs: JSSJob[], inProgressUploadJobs: JSSJob[]): boolean => {
    const incompleteAddMetadataJobs = addMetadataJobs.filter(
      (addMetadataJob) => {
        const matchingUploadJob = inProgressUploadJobs.find(
          (uploadJob) => uploadJob.jobId === addMetadataJob.parentId
        );
        if (!matchingUploadJob) {
          // If the parent upload job is not in progress, then this job is not counted
          return false;
        }
        return IN_PROGRESS_STATUSES.includes(addMetadataJob.status);
      }
    );
    return incompleteAddMetadataJobs.length === 0;
  }
);

export const getCurrentJobName = createSelector(
  [getUpload, getUploadFileNames, getCurrentUploadFilePath],
  (
    upload: UploadStateBranch,
    fileNames: string,
    currentUploadFilePath?: string
  ): string | undefined => {
    if (isEmpty(upload)) {
      return undefined;
    }
    return currentUploadFilePath || fileNames;
  }
);

export const getUploadInProgress = createSelector(
  [getRequestsInProgress, getCurrentJobName],
  (requestsInProgress: string[], currentJobName?: string): boolean => {
    return (
      !!currentJobName &&
      requestsInProgress.includes(
        `${AsyncRequest.INITIATE_UPLOAD}-${currentJobName}`
      )
    );
  }
);
