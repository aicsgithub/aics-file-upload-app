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
import { handleUploadProgress } from "../stateHelpers";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicTransformDependencies,
  ReduxLogicTransformDependenciesWithAction,
} from "../types";
import { uploadFailed, uploadSucceeded } from "../upload/actions";
import { REQUEST_MOST_RECENT_SUCCESSFUL_ETL } from "../upload/constants";

import {
  receiveMostRecentSuccessfulEtl,
  updateUploadProgressInfo,
} from "./actions";
import {
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  RECEIVE_JOB_INSERT,
} from "./constants";
import {
  getJobIdToUploadJobMap,
  getMostRecentSuccessfulETL,
} from "./selectors";
import {
  ReceiveJobInsertAction,
  ReceiveJobsAction,
  ReceiveJobUpdateAction,
} from "./types";

export const receiveJobsLogic = createLogic({
  process: async (
    {
      action,
      fms,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<ReceiveJobsAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    // Jobs have the potential to be abandoned i.e. left while in progress
    // in that scenario they will be unable to have contiued and should be auto-retried
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
  transform: (
    { action }: ReduxLogicTransformDependenciesWithAction<ReceiveJobsAction>,
    next: ReduxLogicNextCb
  ) => {
    const jobs = action.payload;
    const uploadJobs = jobs.filter(
      (job) => job.serviceFields?.type === "upload"
    );
    const jobIdToEtlStatus = jobs.reduce(
      (accum, job) =>
        job.serviceFields?.type !== "ETL"
          ? accum
          : {
              ...accum,
              [job.parentId || ""]: job.status,
            },
      {} as { [jobId: string]: JSSJobStatus }
    );

    const uploadJobsWithEtlStatus = uploadJobs.map((job) => ({
      ...job,
      serviceFields: {
        ...job.serviceFields,
        etlStatus: jobIdToEtlStatus[job.jobId],
      },
    }));

    next({
      ...action,
      payload: uploadJobsWithEtlStatus,
    });
  },
  type: RECEIVE_JOBS,
  warnTimeout: 0,
});

const receiveJobInsertLogic = createLogic({
  transform: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<ReceiveJobInsertAction>,
    next: ReduxLogicNextCb
  ) => {
    let updatedJob: JSSJob = action.payload;

    // If the updated job was from the ETL find the related job
    // and update it with ETL info
    if (updatedJob.serviceFields?.type === "ETL") {
      const jobIdToJobMap = getJobIdToUploadJobMap(getState());
      const uploadJob = jobIdToJobMap.get(updatedJob.parentId || "") as JSSJob;
      updatedJob = {
        ...uploadJob,
        serviceFields: {
          ...uploadJob,
          etlStatus: updatedJob.status,
        },
      };
    }

    next({
      ...action,
      payload: updatedJob,
    });
  },
  type: RECEIVE_JOB_INSERT,
});

// When the app receives a job update, it will also alert the user if the job update means that a upload succeeded or failed.
const receiveJobUpdateLogic = createLogic({
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
      if (
        updatedJob.status === JSSJobStatus.SUCCEEDED &&
        updatedJob.serviceFields?.etlStatus === JSSJobStatus.SUCCEEDED
      ) {
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
    let updatedJob: JSSJob = action.payload;
    const jobIdToJobMap = getJobIdToUploadJobMap(getState());

    // If the updated job was from the ETL find the related job
    if (updatedJob.serviceFields?.type === "ETL") {
      const uploadJob = jobIdToJobMap.get(updatedJob.parentId || "") as JSSJob;
      updatedJob = {
        ...uploadJob,
        serviceFields: {
          ...uploadJob,
          etlStatus: updatedJob.status,
        },
      };
    }

    ctx.previousJob = jobIdToJobMap.get(updatedJob.jobId);
    next(action);
  },
  type: RECEIVE_JOB_UPDATE,
});

export const requestMostRecentSuccessfulETLLogic = createLogic({
  process: async (
    deps: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const currentlyMostRecentEtl = getMostRecentSuccessfulETL(deps.getState());

    const etl = await deps.labkeyClient.findMostRecentSuccessfulETL();

    if (!currentlyMostRecentEtl || etl > currentlyMostRecentEtl) {
      dispatch(receiveMostRecentSuccessfulEtl(etl));
    }

    done();
  },
  type: REQUEST_MOST_RECENT_SUCCESSFUL_ETL,
});

export default [
  receiveJobsLogic,
  receiveJobInsertLogic,
  receiveJobUpdateLogic,
  requestMostRecentSuccessfulETLLogic,
];
