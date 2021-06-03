import { createLogic } from "redux-logic";

import { StepName, UploadServiceFields } from "../../services/aicsfiles/types";
import {
  IN_PROGRESS_STATUSES,
  JSSJob,
  JSSJobStatus,
} from "../../services/job-status-client/types";
import { setErrorAlert, setInfoAlert } from "../feedback/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicTransformDependenciesWithAction,
} from "../types";
import { uploadFailed, uploadSucceeded } from "../upload/actions";
import { handleUploadProgress } from "../util";

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
    // TODO: This filter needs work -- selector for getting jobs at a certain stage
    const abandonedJobs = action.payload.filter(
      ({ currentStage, status }) =>
        IN_PROGRESS_STATUSES.includes(status) &&
        [
          StepName.CopyFilesChild.toString(),
          StepName.AddMetadata.toString(),
          StepName.CopyFiles.toString(),
          StepName.Waiting.toString(),
          "", // if no currentStage, it is probably worth retrying this job
        ].includes(currentStage || "")
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
            await fms.retryUpload(
              abandonedJob.jobId,
              handleUploadProgress([abandonedJob.jobName || ""], (progress) =>
                dispatch(updateUploadProgressInfo(abandonedJob.jobId, progress))
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

const isUploadJob = (job: JSSJob): job is JSSJob<UploadServiceFields> =>
  job.serviceFields?.type === "upload";
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
    const { prevStatus } = ctx;
    const { payload: updatedJob } = action;
    const jobName = updatedJob.jobName || "";

    if (
      !isUploadJob(updatedJob) ||
      IN_PROGRESS_STATUSES.includes(updatedJob.status) ||
      !prevStatus ||
      prevStatus === updatedJob.status
    ) {
      done();
      return;
    }

    if (updatedJob.status === JSSJobStatus.SUCCEEDED) {
      dispatch(uploadSucceeded(jobName));
    } else if (
      (!updatedJob.serviceFields?.replacementJobIds ||
        !updatedJob.serviceFields?.replacementJobId) &&
      !updatedJob.serviceFields?.cancelled
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
  transform: (
    {
      action,
      ctx,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<ReceiveJobUpdateAction>,
    next: ReduxLogicNextCb
  ) => {
    const { payload: updatedJob } = action;
    const prevJob = getJobIdToUploadJobMapGlobal(getState()).get(
      updatedJob.jobId
    );
    ctx.prevStatus = prevJob?.status;
    next(action);
  },
  type: RECEIVE_JOB_UPDATE,
});

export default [handleAbandonedJobsLogic, receiveJobUpdateLogics];
