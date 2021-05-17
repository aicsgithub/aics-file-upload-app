import { orderBy } from "lodash";
import { createSelector } from "reselect";

import { UploadServiceFields } from "../../services/file-management-system/util";
import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
  JSSJob,
  JSSJobStatus,
  SUCCESSFUL_STATUS,
} from "../../services/job-status-client/types";
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

interface Upload extends JSSJob<UploadServiceFields> {
  jobs?: JSSJob<UploadServiceFields>[];
}

const statusPriorityOrder = [
  JSSJobStatus.UNRECOVERABLE,
  JSSJobStatus.FAILED,
  JSSJobStatus.BLOCKED,
  JSSJobStatus.RETRYING,
  JSSJobStatus.WAITING,
  JSSJobStatus.WORKING,
  JSSJobStatus.SUCCEEDED,
];

// Groups jobs together by the groups they were uploaded in
export const getGroupedUploadJobs = createSelector(
  [getFilteredJobs],
  (uploadJobs): Upload[] =>
    Object.values(
      uploadJobs.reduce((idToJob, job) => {
        // Deprecated path kept for backwards compatibility
        if (!job.serviceFields || !job.serviceFields.groupId) {
          return { ...idToJob, [job.jobId]: job };
        }

        // Display the status of the least successful job
        const jobs = [...(idToJob[job.jobId].jobs || []), job];
        const statusPriorityIndex = jobs.reduce(
          (index, j) => {
            const statusIndex = statusPriorityOrder.findIndex(
              (s) => s === j.status
            );
            return statusIndex < index ? index : statusIndex;
          },
          statusPriorityOrder.findIndex((s) => s === job.status)
        );

        return {
          ...idToJob,
          [job.jobId]: {
            ...job,
            jobs,
            status: statusPriorityOrder[statusPriorityIndex],
          },
        };
      }, {} as { [id: string]: Upload })
    )
);

export const getJobsForTable = createSelector(
  [getGroupedUploadJobs, getCopyProgress, getJobIdToUploadJobMapGlobal],
  (
    uploadJobs: Upload[],
    jobIdToProgress: { [jobId: string]: UploadProgressInfo },
    jobIdToUploadJobMap: Map<string, JSSJob<UploadServiceFields>>
  ): UploadSummaryTableRow[] => {
    uploadJobs = orderBy(uploadJobs, ["modified"], ["desc"]);
    const jobIdsToFilterOut = new Set(
      uploadJobs.flatMap(
        (job) =>
          (job.serviceFields && job.serviceFields.replacementJobIds) || []
      )
    );

    return orderBy(uploadJobs, ["modified"], ["desc"])
      .filter(({ jobId }) => !jobIdsToFilterOut.has(jobId))
      .map((job) => {
        const replacementJobIds =
          (job.serviceFields && job.serviceFields.replacementJobIds) || [];
        const representativeJob = replacementJobIds.reduce(
          (jobSoFar, replacementJobId) => {
            const replacementJob = jobIdToUploadJobMap.get(replacementJobId);
            if (
              replacementJob &&
              new Date(replacementJob.created) > new Date(jobSoFar.created)
            ) {
              return replacementJob;
            }
            return jobSoFar;
          },
          job
        );

        return {
          ...representativeJob,
          created: new Date(job.created),
          key: representativeJob.jobId,
          modified: new Date(representativeJob.modified),
          progress: jobIdToProgress[job.jobId],
          status: representativeJob.status,
        };
      });
  }
);

// The app is only safe to exit after the add metadata step has been completed
// The add metadata step represents sending a request to FSS's /uploadComplete endpoint which delegates
// The last steps of the upload to FSS
export const getIsSafeToExit = createSelector(
  [getGroupedUploadJobs],
  (jobs: JSSJob<UploadServiceFields>[]): boolean => {
    return !jobs.some(
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
