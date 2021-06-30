import { createLogic } from "redux-logic";

import { CopyCancelledError } from "../../services/fms-client/CopyCancelledError";
import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
  JSSJob,
  JSSJobStatus,
  UploadStage,
} from "../../services/job-status-client/types";
import { setErrorAlert, setInfoAlert } from "../feedback/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicTransformDependencies,
} from "../types";
import { uploadFailed, uploadSucceeded } from "../upload/actions";
import { handleUploadProgress } from "../util";

import { updateUploadProgressInfo } from "./actions";
import { RECEIVE_JOB_UPDATE, RECEIVE_JOBS } from "./constants";
import { getJobIdToUploadJobMap } from "./selectors";
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
          if (!(e instanceof CopyCancelledError)) {
            const message = `Retry for upload "${abandonedJob.jobName}" failed: ${e.message}`;
            logger.error(message, e);
            dispatch(setErrorAlert(message));
          }
        }
      })
    );

    done();
  },
  type: RECEIVE_JOBS,
  warnTimeout: 0,
});

// When the app receives a job update, it will also alert the user if the job update means that a upload succeeded or failed.
const receiveJobUpdateLogics = createLogic({
  process: (
    {
      action,
      ctx,
    }: ReduxLogicProcessDependenciesWithAction<ReceiveJobUpdateAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { payload: updatedJob } = action;
    const jobName = updatedJob.jobName || "";
    const previousJob: JSSJob = ctx.previousJob;

    if (updatedJob.status !== previousJob.status) {
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
    }

    done();
  },
  transform: (
    { action, ctx, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const updatedJob: JSSJob = action.payload;
    const jobIdToJobMap = getJobIdToUploadJobMap(getState());
    ctx.previousJob = jobIdToJobMap.get(updatedJob.jobId);
    next(action);
  },
  type: RECEIVE_JOB_UPDATE,
});

export default [handleAbandonedJobsLogic, receiveJobUpdateLogics];
