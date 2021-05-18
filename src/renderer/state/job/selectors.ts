import { orderBy } from "lodash";
import { createSelector } from "reselect";

import { StepName, UploadServiceFields } from "../../services/aicsfiles/types";
import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
  JSSJob,
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
  [
    getFilteredJobs,
    getCopyProgress,
    getJobIdToUploadJobMapGlobal,
    getUploadGroupToUploads,
  ],
  (
    uploadJobs: JSSJob<UploadServiceFields>[],
    copyProgress: { [jobId: string]: UploadProgressInfo },
    jobIdToUploadJobMap: Map<string, JSSJob<UploadServiceFields>>,
    groupIdToJobs: { [groupId: string]: JSSJob<UploadServiceFields>[] }
  ): UploadSummaryTableRow[] => {
    const jobIdsToFilterOut = new Set(
      uploadJobs.flatMap((job) => job?.serviceFields?.replacementJobIds || [])
    );

    return orderBy(uploadJobs, ["modified"], ["desc"])
      .filter(({ jobId }) => !jobIdsToFilterOut.has(jobId))
      .map((job) => {
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
        let serviceFields = representativeJob.serviceFields;
        if (serviceFields && serviceFields.groupId) {
          serviceFields = {
            ...serviceFields,
            files: groupIdToJobs[serviceFields.groupId].flatMap(
              (j) => j?.serviceFields?.files || []
            ),
          };
        }
        return {
          ...representativeJob,
          serviceFields,
          created: new Date(job.created),
          key: representativeJob.jobId,
          modified:
            originalModified < representativeModified
              ? representativeModified
              : originalModified,
          progress: copyProgress[job.jobId],
          status: representativeJob.status,
        };
      });
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
