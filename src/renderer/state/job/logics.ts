import { createLogic } from "redux-logic";

import {
  StepName,
  UploadMetadata as AicsFilesUploadMetadata,
} from "../../services/aicsfiles/types";
import {
  IN_PROGRESS_STATUSES,
  JSSJobStatus,
} from "../../services/job-status-client/types";
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
  ReduxLogicTransformDependenciesWithAction,
} from "../types";
import { uploadFailed, uploadSucceeded } from "../upload/actions";
import { batchActions, handleUploadProgress } from "../util";

import { updateUploadProgressInfo } from "./actions";
import { RECEIVE_JOB_UPDATE, RECEIVE_JOBS } from "./constants";
import { getJobIdToUploadJobMapGlobal } from "./selectors";
import { ReceiveJobsAction, ReceiveJobUpdateAction } from "./types";

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

const receiveJobUpdateLogics = createLogic({
  transform: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<ReceiveJobUpdateAction>,
    next: ReduxLogicNextCb
  ) => {
    const { payload: updatedJob } = action;
    if (
      updatedJob.serviceFields?.type !== "upload" ||
      IN_PROGRESS_STATUSES.includes(updatedJob.status)
    ) {
      next(action);
    } else {
      const prevJob = getJobIdToUploadJobMapGlobal(getState()).get(
        updatedJob.jobId
      );
      if (!prevJob || prevJob.status === updatedJob.status) {
        next(action);
      } else if (updatedJob.status === JSSJobStatus.SUCCEEDED) {
        next(batchActions([action, uploadSucceeded(updatedJob.jobName || "")]));
      } else {
        const error = updatedJob?.serviceFields?.error
          ? `Upload ${updatedJob.jobName} Failed: ${updatedJob?.serviceFields?.error}`
          : `Upload ${updatedJob.jobName} Failed`;
        next(
          batchActions([action, uploadFailed(updatedJob.jobName || "", error)])
        );
      }
    }
  },
  type: RECEIVE_JOB_UPDATE,
});

export default [handleAbandonedJobsLogic, receiveJobUpdateLogics];
