import { createLogic } from "redux-logic";

import {
  StepName,
  UploadMetadata as AicsFilesUploadMetadata,
} from "../../services/aicsfiles/types";
import { IN_PROGRESS_STATUSES } from "../../services/job-status-client/types";
import { COPY_PROGRESS_THROTTLE_MS } from "../constants";
import {
  setErrorAlert,
  setInfoAlert,
  setSuccessAlert,
} from "../feedback/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
} from "../types";
import { handleUploadProgress } from "../util";

import { updateUploadProgressInfo } from "./actions";
import { RECEIVE_JOBS } from "./constants";
import { ReceiveJobsAction } from "./types";

export const handleAbandonedJobsLogic = createLogic({
  process: async (
    {
      action,
      fms,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<ReceiveJobsAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const abandonedJobs = action.payload.filter(
      ({ currentStage, serviceFields, status }) =>
        serviceFields?.type === "upload" &&
        IN_PROGRESS_STATUSES.includes(status) &&
        [
          StepName.CopyFilesChild.toString(),
          StepName.AddMetadata.toString(),
          StepName.CopyFiles.toString(),
          StepName.Waiting.toString(),
          "", // if no currentStage, it is probably worth retrying this job
        ].includes(currentStage || "")
    );

    if (abandonedJobs.length < 1) {
      done();
      return;
    }

    try {
      // Wait for every abandoned job to be processed
      await Promise.all(
        abandonedJobs.map(async (abandonedJob) => {
          logger.info(
            `Upload "${abandonedJob.jobName}" was abandoned and will now be retried.`
          );
          dispatch(
            setInfoAlert(
              `Upload "${abandonedJob.jobName}" was abandoned and will now be retried.`
            )
          );

          // Use the most up to date version of the job, which is returned
          // after the upload is failed
          const [updatedJob] = await fms.failUpload(abandonedJob.jobId);
          const fileNames = updatedJob.serviceFields.files.map(
            ({ file: { originalPath } }: AicsFilesUploadMetadata) =>
              originalPath
          );

          try {
            await fms.retryUpload(
              updatedJob,
              handleUploadProgress(fileNames, (progress) =>
                dispatch(updateUploadProgressInfo(updatedJob.jobId, progress))
              ),
              COPY_PROGRESS_THROTTLE_MS
            );
            logger.info(`Retry upload "${updatedJob.jobName}" succeeded!`);
            dispatch(
              setSuccessAlert(
                `Retry for upload "${updatedJob.jobName}" succeeded!`
              )
            );
          } catch (e) {
            logger.error(`Retry for upload "${updatedJob.jobName}" failed`, e);
            dispatch(
              setErrorAlert(
                `Retry for upload "${updatedJob.jobName}" failed: ${e.message}`
              )
            );
          }
        })
      );
    } catch (e) {
      logger.error(`Could not retry abandoned jobs.`, e);
      dispatch(setErrorAlert(`Could not retry abandoned jobs: ${e.message}`));
    } finally {
      done();
    }
  },
  type: RECEIVE_JOBS,
  warnTimeout: 0,
});

export default [handleAbandonedJobsLogic];
