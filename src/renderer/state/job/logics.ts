import { createLogic } from "redux-logic";

import {
  StepName,
  UploadMetadata as AicsFilesUploadMetadata,
  UploadServiceFields,
} from "../../services/aicsfiles/types";
import {
  IN_PROGRESS_STATUSES,
  JSSJob,
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
import {
  retryUploadFailed,
  retryUploadSucceeded,
  uploadFailed,
  uploadSucceeded,
} from "../upload/actions";
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
      if (prevStatus === JSSJobStatus.RETRYING) {
        dispatch(retryUploadSucceeded(jobName));
      } else {
        dispatch(uploadSucceeded(jobName));
      }
    } else if (
      !updatedJob.serviceFields?.replacementJobId &&
      !updatedJob.serviceFields?.cancelled
    ) {
      if (prevStatus === JSSJobStatus.RETRYING) {
        const error = `Retry upload ${jobName} failed${
          updatedJob?.serviceFields?.error
            ? `: ${updatedJob?.serviceFields?.error}`
            : ""
        }`;
        dispatch(retryUploadFailed(jobName, error));
      } else {
        const error = `Upload ${jobName} failed${
          updatedJob?.serviceFields?.error
            ? `: ${updatedJob?.serviceFields?.error}`
            : ""
        }`;
        dispatch(uploadFailed(jobName, error));
      }
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
    const jobId = updatedJob.serviceFields?.originalJobId || updatedJob.jobId;
    const prevJob = getJobIdToUploadJobMapGlobal(getState()).get(jobId);
    ctx.prevStatus = prevJob?.status;
    next(action);
  },
  type: RECEIVE_JOB_UPDATE,
});

export default [handleAbandonedJobsLogic, receiveJobUpdateLogics];
