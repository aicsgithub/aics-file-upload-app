import { isEmpty, uniq, without } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { Observable } from "rxjs";
import { interval } from "rxjs/internal/observable/interval";
import { map, mergeMap, takeUntil } from "rxjs/operators";

import { INCOMPLETE_JOB_IDS_KEY } from "../../../shared/constants";
import { JobStatusClient } from "../../services";
import { UploadMetadata as AicsFilesUploadMetadata } from "../../services/aicsfiles/types";
import { JSSJob } from "../../services/job-status-client/types";
import { LocalStorage } from "../../types";
import {
  UPLOAD_WORKER_ON_PROGRESS,
  UPLOAD_WORKER_SUCCEEDED,
} from "../constants";
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
  JobFilter,
  Logger,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicTransformDependencies,
  State,
} from "../types";
import {
  CANCEL_UPLOAD,
  INITIATE_UPLOAD_SUCCEEDED,
  RETRY_UPLOAD,
} from "../upload/constants";
import { batchActions } from "../util";

import {
  receiveJobs,
  retrieveJobsFailed,
  startJobPoll,
  stopJobPoll,
  updateIncompleteJobIds,
} from "./actions";
import {
  FAILED_STATUSES,
  GATHER_STORED_INCOMPLETE_JOB_IDS,
  HANDLE_ABANDONED_JOBS,
  IN_PROGRESS_STATUSES,
  RETRIEVE_JOBS,
  START_JOB_POLL,
  STOP_JOB_POLL,
  SUCCESSFUL_STATUS,
} from "./constants";
import { getIncompleteJobIds, getJobFilter } from "./selectors";
import { HandleAbandonedJobsAction } from "./types";

interface Jobs {
  actualIncompleteJobIds?: string[];
  addMetadataJobs?: JSSJob[];
  error?: Error;
  recentlySucceededJobNames?: string[];
  recentlyFailedJobNames?: string[];
  uploadJobs?: JSSJob[];
}

const getJobStatusesToInclude = (jobFilter: JobFilter): string[] => {
  switch (jobFilter) {
    case JobFilter.Successful:
      return [SUCCESSFUL_STATUS];
    case JobFilter.Failed:
      return [...FAILED_STATUSES];
    case JobFilter.InProgress:
      return [...IN_PROGRESS_STATUSES];
    default:
      return [...FAILED_STATUSES, SUCCESSFUL_STATUS, ...IN_PROGRESS_STATUSES];
  }
};

export const fetchJobs = async (
  getStateFn: () => State,
  jssClient: JobStatusClient,
  jobFilter?: JobFilter
): Promise<Jobs> => {
  const statusesToInclude = getJobStatusesToInclude(
    jobFilter || getJobFilter(getStateFn())
  );

  const previouslyIncompleteJobIds = getIncompleteJobIds(getStateFn());
  const user = getLoggedInUser(getStateFn());
  const recentlySucceededJobsPromise: Promise<
    JSSJob[]
  > = previouslyIncompleteJobIds.length
    ? jssClient.getJobs({
        jobId: { $in: previouslyIncompleteJobIds },
        status: SUCCESSFUL_STATUS,
        user,
      })
    : Promise.resolve([]);
  const recentlyFailedJobsPromise: Promise<
    JSSJob[]
  > = previouslyIncompleteJobIds.length
    ? jssClient.getJobs({
        jobId: { $in: previouslyIncompleteJobIds },
        status: { $in: FAILED_STATUSES },
        user,
      })
    : Promise.resolve([]);
  const getUploadJobsPromise: Promise<JSSJob[]> = jssClient.getJobs({
    serviceFields: {
      type: "upload",
    },
    status: { $in: statusesToInclude },
    user,
  });

  try {
    const [
      recentlySucceededJobs,
      recentlyFailedJobs,
      uploadJobs,
    ] = await Promise.all([
      recentlySucceededJobsPromise,
      recentlyFailedJobsPromise,
      getUploadJobsPromise,
    ]);
    const recentlyFailedJobIds: string[] = (recentlyFailedJobs || []).map(
      ({ jobId }: JSSJob) => jobId
    );
    const recentlySucceededJobIds: string[] = (recentlySucceededJobs || []).map(
      ({ jobId }: JSSJob) => jobId
    );
    const actualIncompleteJobIds = without(
      previouslyIncompleteJobIds,
      ...recentlySucceededJobIds,
      ...recentlyFailedJobIds
    );

    const result = {
      actualIncompleteJobIds,
      addMetadataJobs: [],
      recentlyFailedJobNames: recentlyFailedJobIds,
      recentlySucceededJobNames: recentlySucceededJobIds,
      uploadJobs,
    };

    if (actualIncompleteJobIds.length === 0) {
      return result;
    }

    // only get child jobs for the incomplete jobs
    const addMetadataJobs = await jssClient.getJobs({
      parentId: { $in: actualIncompleteJobIds },
      serviceFields: {
        type: "add_metadata",
      },
      user,
    });

    return {
      ...result,
      addMetadataJobs,
    };
  } catch (error) {
    return { error };
  }
};

export const mapJobsToActions = (storage: LocalStorage, logger: Logger) => (
  jobs: Jobs
) => {
  const {
    actualIncompleteJobIds,
    addMetadataJobs,
    error,
    recentlyFailedJobNames,
    recentlySucceededJobNames,
    uploadJobs,
  } = jobs;
  if (error) {
    logger.error(error);
    return retrieveJobsFailed(`Could not retrieve jobs: ${error.message}`);
  }

  const actions: AnyAction[] = [];

  let updates: { [jobName: string]: undefined } = {};

  // report the status of jobs that have recently failed and succeeded
  // since we can only set one alert at a time, we will leave anything remaining for the next job poll
  if (recentlyFailedJobNames?.length) {
    const jobName = recentlyFailedJobNames.shift();
    actions.push(setErrorAlert(`${jobName} Failed`));
    (actualIncompleteJobIds || []).push(...recentlyFailedJobNames);
  } else if (recentlySucceededJobNames?.length) {
    const jobName = recentlySucceededJobNames.shift();
    actions.push(setSuccessAlert(`${jobName} Succeeded`));
    (actualIncompleteJobIds || []).push(...recentlySucceededJobNames);
  }

  // Only update the state if the current incompleteJobs are different than the existing ones
  const potentiallyIncompleteJobIdsStored = storage.get(INCOMPLETE_JOB_IDS_KEY);
  if (
    actualIncompleteJobIds &&
    potentiallyIncompleteJobIdsStored.length !== actualIncompleteJobIds.length
  ) {
    try {
      storage.set(INCOMPLETE_JOB_IDS_KEY, actualIncompleteJobIds);
    } catch (e) {
      logger.warn(
        `Failed to update incomplete job names: ${actualIncompleteJobIds.join(
          ", "
        )}`
      );
    }
    updates = {
      ...updates,
      ...updateIncompleteJobIds(actualIncompleteJobIds).updates, // write incomplete job names to store
    };
    if (actualIncompleteJobIds.length === 0) {
      actions.push(stopJobPoll());
    }
  }
  actions.push(
    receiveJobs(uploadJobs, addMetadataJobs, actualIncompleteJobIds)
  );
  let nextAction: AnyAction = batchActions(actions);
  if (!isEmpty(updates)) {
    // delete drafts that are no longer pending
    nextAction = {
      ...nextAction,
      updates,
      writeToStore: true,
    };
  }
  return nextAction;
};

const retrieveJobsLogic = createLogic({
  debounce: 500,
  latest: true,
  process: async (
    deps: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { getState, jssClient, logger, storage } = deps;
    const jobs = await getWithRetry(
      () => fetchJobs(getState, jssClient),
      dispatch
    );
    dispatch(mapJobsToActions(storage, logger)(jobs));
    done();
  },
  type: RETRIEVE_JOBS,
  warnTimeout: 0,
});

export const handleAbandonedJobsLogic = createLogic({
  type: HANDLE_ABANDONED_JOBS,
  warnTimeout: 0,
  async process(
    {
      logger,
      getRetryUploadWorker,
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

      if (abandonedJobs.length > 0) {
        dispatch(startJobPoll());
      }

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

          // Wait until the worker succeeds or encounters an error
          await new Promise((resolve) => {
            const worker = getRetryUploadWorker();

            worker.onmessage = (e: MessageEvent) => {
              const lowerCaseMessage = e?.data.toLowerCase();
              if (lowerCaseMessage.includes(UPLOAD_WORKER_SUCCEEDED)) {
                logger.info(`Retry upload "${updatedJob.jobName}" succeeded!`);
                dispatch(
                  setSuccessAlert(
                    `Retry for upload "${updatedJob.jobName}" succeeded!`
                  )
                );
                resolve();
              } else if (lowerCaseMessage.includes(UPLOAD_WORKER_ON_PROGRESS)) {
                logger.info(e.data);
              } else {
                logger.info(e.data);
              }
            };

            worker.onerror = (e: ErrorEvent) => {
              logger.error(
                `Retry for upload "${updatedJob.jobName}" failed`,
                e
              );
              dispatch(
                setErrorAlert(
                  `Retry for upload "${updatedJob.jobName}" failed: ${e.message}`
                )
              );
              resolve();
            };

            const fileNames = updatedJob.serviceFields.files.map(
              ({ file: { originalPath } }: AicsFilesUploadMetadata) =>
                originalPath
            );
            worker.postMessage([
              updatedJob,
              fileNames,
              fms.host,
              fms.port,
              fms.username,
            ]);
          });
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

// Based on https://codesandbox.io/s/j36jvpn8rv?file=/src/index.js
const pollJobsLogic = createLogic({
  cancelType: STOP_JOB_POLL,
  debounce: 500,
  latest: true,
  // Redux Logic's type definitions do not include dispatching observable actions so we are setting
  // the type of dispatch to any
  process: (deps: ReduxLogicProcessDependencies, dispatch: any) => {
    const { cancelled$, getState, jssClient, logger, storage } = deps;
    dispatch(
      interval(1000).pipe(
        mergeMap(() => {
          return fetchJobs(getState, jssClient);
        }),
        map(mapJobsToActions(storage, logger)),
        // CancelType doesn't seem to prevent polling the server even though the logics stops dispatching
        // haven't figured out why but this seems to stop the interval
        takeUntil((cancelled$ as any) as Observable<any>)
      )
    );
  },
  type: [
    START_JOB_POLL,
    INITIATE_UPLOAD_SUCCEEDED,
    CANCEL_UPLOAD,
    RETRY_UPLOAD,
  ],
  warnTimeout: 0,
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

export default [
  retrieveJobsLogic,
  pollJobsLogic,
  handleAbandonedJobsLogic,
  gatherStoredIncompleteJobIdsLogic,
];
