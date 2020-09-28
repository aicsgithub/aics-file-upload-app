import { basename } from "path";

import { isEmpty, orderBy } from "lodash";
import { createSelector } from "reselect";

import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
  JSSJob,
  SUCCESSFUL_STATUS,
} from "../../services/job-status-client/types";
import { getRequestsInProgress } from "../feedback/selectors";
import { getCurrentUploadFilePath } from "../metadata/selectors";
import {
  AsyncRequest,
  JobFilter,
  State,
  UploadProgressInfo,
  UploadStateBranch,
  UploadSummaryTableRow,
} from "../types";
import { getUpload, getUploadFileNames } from "../upload/selectors";

export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getAddMetadataJobs = (state: State) => state.job.addMetadataJobs;
export const getJobFilter = (state: State) => state.job.jobFilter;
export const getCopyProgress = (state: State) => state.job.copyProgress;

function getStatusesFromFilter(jobFilter: JobFilter): string[] {
  switch (jobFilter) {
    case JobFilter.Successful:
      return [SUCCESSFUL_STATUS];
    case JobFilter.Failed:
      return FAILED_STATUSES;
    case JobFilter.InProgress:
      return IN_PROGRESS_STATUSES;
    default:
      return [...FAILED_STATUSES, SUCCESSFUL_STATUS, ...IN_PROGRESS_STATUSES];
  }
}

export const getFilteredJobs = createSelector(
  [getUploadJobs, getJobFilter],
  (uploadJobs, jobFilter): JSSJob[] => {
    const statuses = getStatusesFromFilter(jobFilter);
    return uploadJobs.filter((job) => statuses.includes(job.status));
  }
);

export const getJobsForTable = createSelector(
  [getFilteredJobs, getCopyProgress],
  (
    uploadJobs: JSSJob[],
    copyProgress: { [jobId: string]: UploadProgressInfo }
  ): UploadSummaryTableRow[] => {
    return orderBy(uploadJobs, ["modified"], ["desc"]).map((job) => {
      return {
        ...job,
        created: new Date(job.created),
        key: job.jobId,
        modified: new Date(job.modified),
        progress: copyProgress[job.jobId],
      };
    });
  }
);

// The app is only safe to exit after the add metadata step has been completed
// The add metadata step represents sending a request to FSS's /uploadComplete endpoint which delegates
// The last steps of the upload to FSS
// addMetadataJobs only contains add metadata child jobs for actual in progress uploads
export const getIsSafeToExit = createSelector(
  [getAddMetadataJobs],
  (addMetadataJobs: JSSJob[]): boolean =>
    !addMetadataJobs.some((j) => IN_PROGRESS_STATUSES.includes(j.status))
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

    if (currentUploadFilePath) {
      return basename(currentUploadFilePath, ".json");
    }

    return fileNames;
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
