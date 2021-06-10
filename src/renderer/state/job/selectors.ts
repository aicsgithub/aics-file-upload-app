import { orderBy } from "lodash";
import { createSelector } from "reselect";

import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
  JSSJob,
  SUCCESSFUL_STATUS,
  UploadStage,
} from "../../services/job-status-client/types";
import { UploadServiceFields } from "../../services/types";
import { JobFilter, State, UploadSummaryTableRow } from "../types";

export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getJobFilter = (state: State) => state.job.jobFilter;
export const getCopyProgress = (state: State) => state.job.copyProgress;

export const getJobIdToUploadJobMap = createSelector(
  [getUploadJobs],
  (jobs): Map<string, JSSJob<UploadServiceFields>> =>
    jobs.reduce((map, job) => {
      map.set(job.jobId, job);
      return map;
    }, new Map<string, JSSJob<UploadServiceFields>>())
);

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

export const getUploadGroupToUploads = createSelector(
  [getFilteredJobs],
  (jobs): { [groupId: string]: JSSJob<UploadServiceFields>[] } =>
    jobs.reduce(
      (groupIdToJobs, job) => ({
        ...groupIdToJobs,
        [job.serviceFields?.groupId || ""]: [
          ...(groupIdToJobs[job.serviceFields?.groupId || ""] || []),
          job,
        ],
      }),
      {} as { [groupId: string]: JSSJob[] }
    )
);

export const getJobsForTable = createSelector(
  [getFilteredJobs, getCopyProgress, getUploadGroupToUploads],
  (uploadJobs, copyProgress, groupIdToJobs): UploadSummaryTableRow[] => {
    const replacedJobIdSet = uploadJobs.reduce((setSoFar, job) => {
      if (job.serviceFields?.originalJobId) {
        setSoFar.add(job.serviceFields.originalJobId);
      }
      return setSoFar;
    }, new Set());

    return orderBy(uploadJobs, ["modified"], ["desc"])
      .filter(({ jobId }) => !replacedJobIdSet.has(jobId))
      .map((job) => ({
        ...job,
        key: job.jobId,
        created: new Date(job.created),
        modified: new Date(job.modified),
        progress: copyProgress[job.jobId],
        serviceFields: {
          ...job.serviceFields,
          files: job.serviceFields?.groupId
            ? groupIdToJobs[job.serviceFields.groupId].flatMap(
                (j) => j?.serviceFields?.files || []
              )
            : job.serviceFields?.files || [],
          result: job.serviceFields?.groupId
            ? groupIdToJobs[job.serviceFields.groupId].flatMap(
                (j) => j?.serviceFields?.result || []
              )
            : job.serviceFields?.result || [],
        },
      })) as UploadSummaryTableRow[];
  }
);

// The app is only safe to exit after the client side of the upload completes
// this is signaled by the "currentStage" of the job being after the
// "Waiting for file copy" stage set by FSS when the upload is initiated.
export const getIsSafeToExit = createSelector(
  [getUploadJobs],
  (uploadJobs: JSSJob<UploadServiceFields>[]): boolean =>
    !uploadJobs.some(
      (job) =>
        job.currentStage === UploadStage.WAITING_FOR_CLIENT_COPY &&
        IN_PROGRESS_STATUSES.includes(job.status)
    )
);
