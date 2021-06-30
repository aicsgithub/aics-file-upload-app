import { orderBy } from "lodash";
import { createSelector } from "reselect";

import {
  IN_PROGRESS_STATUSES,
  JSSJob,
  UploadStage,
} from "../../services/job-status-client/types";
import { UploadServiceFields } from "../../services/types";
import { State, UploadSummaryTableRow } from "../types";

export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getJobIdToCopyProgress = (state: State) => state.job.copyProgress;
export const getLastSelectedUpload = (state: State) =>
  state.job.lastSelectedUpload;

export const getJobIdToUploadJobMap = createSelector(
  [getUploadJobs],
  (jobs): Map<string, JSSJob<UploadServiceFields>> =>
    jobs.reduce((map, job) => {
      map.set(job.jobId, job);
      return map;
    }, new Map<string, JSSJob<UploadServiceFields>>())
);

export const getJobsForTable = createSelector(
  [getUploadJobs, getJobIdToCopyProgress],
  (uploadJobs, jobIdToCopyProgress): UploadSummaryTableRow[] => {
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
        created: new Date(job.created),
        modified: new Date(job.modified),
        progress: jobIdToCopyProgress[job.jobId],
        fileId: job.serviceFields?.result
          ?.map((file) => file.fileId)
          .join(", "),
        filePath: job.serviceFields?.result
          ?.map((file) => file.readPath)
          .join(", "),
      })) as UploadSummaryTableRow[];
  }
);

export const getUploadsByTemplateUsage = createSelector(
  [getJobsForTable],
  (
    jobs
  ): {
    uploadsWithTemplates: UploadSummaryTableRow[];
    uploadsWithoutTemplates: UploadSummaryTableRow[];
  } => {
    const uploadsWithTemplates: UploadSummaryTableRow[] = [];
    const uploadsWithoutTemplates: UploadSummaryTableRow[] = [];
    jobs.forEach((job) => {
      if (job.serviceFields?.files?.[0].customMetadata) {
        uploadsWithTemplates.push(job);
      } else {
        uploadsWithoutTemplates.push(job);
      }
    });
    return { uploadsWithTemplates, uploadsWithoutTemplates };
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
