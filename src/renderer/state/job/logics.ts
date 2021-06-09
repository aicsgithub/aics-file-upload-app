import { createLogic } from "redux-logic";

import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
  JSSJobStatus,
  UploadStage,
} from "../../services/job-status-client/types";
import { setErrorAlert, setInfoAlert } from "../feedback/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
} from "../types";
import { uploadFailed, uploadSucceeded } from "../upload/actions";
import { handleUploadProgress } from "../util";

import { updateUploadProgressInfo } from "./actions";
import { RECEIVE_JOB_UPDATE, RECEIVE_JOBS } from "./constants";
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
      ({ status, currentStage }) =>
        currentStage === UploadStage.WAITING_FOR_CLIENT_COPY &&
        IN_PROGRESS_STATUSES.includes(status)
    );
    console.log("abandonedJobs", abandonedJobs);

    if (abandonedJobs.length) {
      await Promise.all(
        abandonedJobs.map(async (abandonedJob) => {
          try {
            // Alert user to abandoned job
            const info = `Upload "${abandonedJob.jobName}" was abandoned and will now be retried.`;
            logger.info(info);
            dispatch(setInfoAlert(info));

            // Cancel the job before attempting to retry it
            await fms.cancelUpload(abandonedJob.jobId);
            await fms.retryUpload(abandonedJob.jobId, (jobId) =>
              handleUploadProgress([abandonedJob.jobName || ""], (progress) =>
                dispatch(updateUploadProgressInfo(jobId, progress))
              )
            );
          } catch (e) {
            const message = `Retry for upload "${abandonedJob.jobName}" failed: ${e.message}`;
            logger.error(message, e);
            dispatch(setErrorAlert(message));
          }
        })
      );
    }

    done();
  },
  type: RECEIVE_JOBS,
  warnTimeout: 0,
});

// When the app receives a job update, it will also alert the user if the job update means that a upload succeeded or failed.
const receiveJobUpdateLogics = createLogic({
  process: (
    { action }: ReduxLogicProcessDependenciesWithAction<ReceiveJobUpdateAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { payload: updatedJob } = action;
    const jobName = updatedJob.jobName || "";

    if (updatedJob.status === JSSJobStatus.SUCCEEDED) {
      dispatch(uploadSucceeded(jobName));
    } else if (
      !updatedJob.serviceFields?.cancelled &&
      FAILED_STATUSES.includes(updatedJob.status)
    ) {
      const error = `Upload ${jobName} failed${
        updatedJob?.serviceFields?.error
          ? `: ${updatedJob?.serviceFields?.error}`
          : ""
      }`;
      dispatch(uploadFailed(error, jobName));
    }

    done();
  },
  type: RECEIVE_JOB_UPDATE,
});

export default [handleAbandonedJobsLogic, receiveJobUpdateLogics];
