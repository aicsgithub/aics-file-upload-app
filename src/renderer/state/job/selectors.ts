import { findIndex, orderBy } from "lodash";
import { createSelector } from "reselect";
import job from ".";

import { StepName, UploadServiceFields } from "../../services/aicsfiles/types";
import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
  JSSJob,
  JSSJobStatus,
  SUCCESSFUL_STATUS,
} from "../../services/job-status-client/types";
import { convertToArray } from "../../util";
import {
  JobFilter,
  JobStateBranch,
  State,
  UploadProgressInfo,
  UploadSummaryTableRow,
} from "../types";

export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getJobFilter = (state: State) => state.job.jobFilter;
export const getCopyProgress = (state: State) => state.job.copyProgress;

// "Local" selectors: selecting off of job state branch as input
export type JobIdToJobMap<T> = Map<string, JSSJob<T>>;
const getUploadJobsFromLocalState = (state: JobStateBranch) => state.uploadJobs;
export const getJobIdToUploadJobMap = createSelector(
  [getUploadJobsFromLocalState],
  (jobs: JSSJob<UploadServiceFields>[]): JobIdToJobMap<UploadServiceFields> => {
    const map = new Map<string, JSSJob<UploadServiceFields>>();
    for (const job of jobs) {
      map.set(job.jobId, job);
    }
    return map;
  }
);

// "Global" selectors
export const getJobIdToUploadJobMapGlobal = (state: State) =>
  getJobIdToUploadJobMap(state.job);
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

const STATUS_PRIORITY_ORDER = [
  JSSJobStatus.RETRYING,
  JSSJobStatus.WAITING,
  JSSJobStatus.WORKING,
  JSSJobStatus.UNRECOVERABLE,
  JSSJobStatus.FAILED,
  JSSJobStatus.BLOCKED,
  JSSJobStatus.SUCCEEDED,
];

export const getJobsForTable = createSelector(
  [getFilteredJobs, getCopyProgress, getJobIdToUploadJobMapGlobal],
  (
    uploadJobs: JSSJob<UploadServiceFields>[],
    copyProgress: { [jobId: string]: UploadProgressInfo },
    jobIdToUploadJobMap: Map<string, JSSJob<UploadServiceFields>>
  ): UploadSummaryTableRow[] => {
    const jobIdsToFilterOut: string[] = [];
    for (const uploadJob of uploadJobs) {
      if (uploadJob?.serviceFields?.replacementJobIds) {
        jobIdsToFilterOut.push(...uploadJob?.serviceFields?.replacementJobIds);
      }
    }

    const jobsGroupedByUpload = Object.values(
      orderBy(uploadJobs, ["modified"], ["desc"])
        .filter(({ jobId }) => !jobIdsToFilterOut.includes(jobId))
        .reduce((idToRow, job) => {
          const replacementJobIds = convertToArray(
            job?.serviceFields?.replacementJobIds
          );
          let representativeJob = job;
          for (const jobId of replacementJobIds) {
            const replacementJob = jobIdToUploadJobMap.get(jobId);
            if (replacementJob) {
              if (
                new Date(replacementJob.created) >
                new Date(representativeJob.created)
              ) {
                representativeJob = replacementJob;
              }
            }
          }

          const originalModified = new Date(job.modified);
          const representativeModified = new Date(representativeJob.modified);
          return {
            ...idToRow,
            [job.serviceFields?.groupId || job.jobId]: [
              ...(idToRow[job?.serviceFields?.groupId || job.jobId] || []),
              {
                ...representativeJob,
                created: new Date(job.created),
                key: representativeJob.jobId,
                modified:
                  originalModified < representativeModified
                    ? representativeModified
                    : originalModified,
                progress: copyProgress[job.jobId],
                status: representativeJob.status,
              },
            ],
          };
        }, {} as { [id: string]: UploadSummaryTableRow[] })
    );

    const jobsForTable = jobsGroupedByUpload.map((jobs) => ({
      // Show information of the least successful job in the upload group
      ...jobs.sort((a, b) =>
        findIndex(STATUS_PRIORITY_ORDER, (status) => status === a.status) > 1
          ? findIndex(STATUS_PRIORITY_ORDER, (status) => status === b.status)
          : -1
      )[0],
      jobName: jobs
        .map((job) => job.jobName)
        .sort()
        .join(", "),
      progress: jobs.reduce((progressSoFar, job) => {
        const fileSize = job.serviceFields?.files?.[0].file.fileSize || 0;
        const progress = job.progress || {
          completedBytes: fileSize,
          totalBytes: fileSize,
        };
        return {
          completedBytes: progressSoFar.completedBytes + progress.completedBytes,
          totalBytes: progressSoFar.totalBytes + progress.totalBytes,
        };
      }, { completedBytes: 0, totalBytes: 0 }),
      uploadGroup: jobs,
    }));
    return orderBy(jobsForTable, ["modified"], ["desc"]);
  }
);

// The app is only safe to exit after the add metadata step has been completed
// The add metadata step represents sending a request to FSS's /uploadComplete endpoint which delegates
// The last steps of the upload to FSS
export const getIsSafeToExit = createSelector(
  [getUploadJobs],
  (uploadJobs: JSSJob<UploadServiceFields>[]): boolean => {
    return !uploadJobs.some(
      (job) =>
        IN_PROGRESS_STATUSES.includes(job.status) &&
        [
          StepName.AddMetadata.toString(),
          StepName.CopyFiles.toString(),
          StepName.CopyFilesChild.toString(),
          StepName.Waiting.toString(),
        ].includes(job.currentStage || "")
    );
  }
);
