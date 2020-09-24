import { uniq } from "lodash";
import { createLogic } from "redux-logic";

import { INCOMPLETE_JOB_IDS_KEY } from "../../../shared/constants";
import { UploadMetadata as AicsFilesUploadMetadata } from "../../services/aicsfiles/types";
import {
  IN_PROGRESS_STATUSES,
  JSSJob,
  SUCCESSFUL_STATUS,
} from "../../services/job-status-client/types";
import { COPY_PROGRESS_THROTTLE_MS } from "../constants";
import {
  setAlert,
  setErrorAlert,
  setInfoAlert,
  setSuccessAlert,
} from "../feedback/actions";
import { getWithRetry } from "../feedback/util";
import { getLoggedInUser } from "../setting/selectors";
import {
  AlertType,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicTransformDependencies,
} from "../types";
import { handleUploadProgress } from "../util";

import { updateIncompleteJobIds, updateUploadProgressInfo } from "./actions";
import {
  GATHER_STORED_INCOMPLETE_JOB_IDS,
  HANDLE_ABANDONED_JOBS,
} from "./constants";
import { HandleAbandonedJobsAction } from "./types";

export const handleAbandonedJobsLogic = createLogic({
  type: HANDLE_ABANDONED_JOBS,
  warnTimeout: 0,
  async process(
    {
      logger,
      fms,
      jssClient,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<HandleAbandonedJobsAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) {
    try {
      const state = getState();
      const user = getLoggedInUser(state);

      const inProgressJobs = await getWithRetry(
        () =>
          jssClient.getJobs({
            status: { $in: IN_PROGRESS_STATUSES },
            serviceFields: { type: "upload" },
            user,
          }),
        dispatch
      );

      let incompleteChildren: JSSJob[] = [];
      if (inProgressJobs.length > 0) {
        incompleteChildren = await getWithRetry(
          () =>
            jssClient.getJobs({
              parentId: { $in: inProgressJobs.map((job) => job.jobId) },
              status: { $ne: SUCCESSFUL_STATUS },
              user,
            }),
          dispatch
        );
      }

      const abandonedJobs = inProgressJobs.filter((job) => {
        // If an in progress upload has no children, it must have been abandoned
        // before the child jobs could have been created.
        if (!job.childIds) {
          return true;
        }

        const incompleteChildrenForJob = incompleteChildren.filter(
          (childJob) => childJob.parentId === job.jobId
        );

        // HEURISTIC:
        // If any of the child jobs of an in progress upload have not
        // completed, then it is very likely that the job is abandoned.
        return incompleteChildrenForJob.length > 0;
      });

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
});

const gatherStoredIncompleteJobIdsLogic = createLogic({
  transform: (
    { storage }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    try {
      const incompleteJobIds = storage.get(INCOMPLETE_JOB_IDS_KEY) || [];
      next(updateIncompleteJobIds(uniq(incompleteJobIds)));
    } catch (e) {
      next(
        setAlert({
          message: "Failed to get saved incomplete jobs",
          type: AlertType.WARN,
        })
      );
    }
  },
  type: GATHER_STORED_INCOMPLETE_JOB_IDS,
});

export default [handleAbandonedJobsLogic, gatherStoredIncompleteJobIdsLogic];
