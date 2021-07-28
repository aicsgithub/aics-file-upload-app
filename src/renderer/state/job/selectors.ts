import { orderBy } from "lodash";
import { createSelector } from "reselect";

import {
  IN_PROGRESS_STATUSES,
  JSSJob,
  JSSJobStatus,
  UploadStage,
} from "../../services/job-status-client/types";
import { UploadServiceFields } from "../../services/types";
import { getTemplateIdToName } from "../metadata/selectors";
import { State, UploadSummaryTableRow } from "../types";

export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getJobIdToCopyProgress = (state: State) => state.job.copyProgress;
export const getLastSelectedUpload = (state: State) =>
  state.job.lastSelectedUpload;
export const getMostRecentSuccessfulETL = (state: State) =>
  state.job.mostRecentSuccessfulETL;

export const getJobIdToUploadJobMap = createSelector(
  [getUploadJobs],
  (jobs): Map<string, JSSJob<UploadServiceFields>> =>
    jobs.reduce((map, job) => {
      map.set(job.jobId, job);
      return map;
    }, new Map<string, JSSJob<UploadServiceFields>>())
);

// TODO: NEed to do something about when multiple ETL jobs are found
// TODO: Resolve to the most successful
export const getUploadsByTemplateUsage = createSelector(
  [
    getUploadJobs,
    getJobIdToCopyProgress,
    getTemplateIdToName,
    getMostRecentSuccessfulETL,
  ],
  (
    uploadJobs,
    jobIdToCopyProgress,
    templateIdToName,
    mostRecentSuccessfulETL
  ): {
    uploadsWithTemplates: UploadSummaryTableRow[];
    uploadsWithoutTemplates: UploadSummaryTableRow[];
  } => {
    const replacedJobIdSet = uploadJobs.reduce((setSoFar, job) => {
      if (job.serviceFields?.originalJobId) {
        setSoFar.add(job.serviceFields.originalJobId);
      }
      return setSoFar;
    }, new Set());

    const uploadsWithTemplates: UploadSummaryTableRow[] = [];
    const uploadsWithoutTemplates: UploadSummaryTableRow[] = [];
    orderBy(uploadJobs, ["created"], ["desc"])
      .filter(({ jobId }) => !replacedJobIdSet.has(jobId))
      .forEach((job) => {
        let status = job.status;
        if (
          mostRecentSuccessfulETL &&
          job.status === JSSJobStatus.SUCCEEDED &&
          job.serviceFields?.etlStatus !== JSSJobStatus.SUCCEEDED &&
          mostRecentSuccessfulETL < new Date(job.modified).getTime()
        ) {
          status = JSSJobStatus.WAITING;
        }
        const upload: UploadSummaryTableRow = {
          ...job,
          status,
          created: new Date(job.created),
          modified: new Date(job.modified),
          progress: jobIdToCopyProgress[job.jobId],
          fileId: job.serviceFields?.result
            ?.map((file) => file.fileId)
            .join(", "),
          filePath: job.serviceFields?.result
            ?.map((file) => file.readPath)
            .join(", "),
          template:
            templateIdToName[
              job.serviceFields?.files?.[0]?.customMetadata?.templateId || 0
            ],
        };

        if (job.serviceFields?.files?.[0]?.customMetadata) {
          uploadsWithTemplates.push(upload);
        } else {
          uploadsWithoutTemplates.push(upload);
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
