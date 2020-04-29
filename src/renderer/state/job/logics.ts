import { JobStatusClient } from "@aics/job-status-client";
import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { Menu } from "electron";
import { isEmpty, without } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { interval } from "rxjs/internal/observable/interval";
import { map, mergeMap } from "rxjs/operators";
import { Error } from "tslint/lib/error";

import { JOB_STORAGE_KEY } from "../../../shared/constants";
import { getWithRetry } from "../../util";

import { addEvent, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { selectPage } from "../route/actions";
import { findNextPage } from "../route/constants";
import { getSelectPageActions } from "../route/logics";
import { getPage } from "../route/selectors";
import { clearStagedFiles } from "../selection/actions";
import { getLoggedInUser } from "../setting/selectors";

import {
    LocalStorage,
    Logger,
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
    State,
} from "../types";
import { DRAFT_KEY } from "../upload/constants";
import { batchActions } from "../util";

import {
    receiveJobs,
    selectJobFilter,
    stopJobPoll,
    updateIncompleteJobNames,
} from "./actions";
import {
    FAILED_STATUSES,
    GATHER_STORED_INCOMPLETE_JOB_NAMES,
    IN_PROGRESS_STATUSES,
    RETRIEVE_JOBS,
    START_JOB_POLL,
    STOP_JOB_POLL,
    SUCCESSFUL_STATUS,
} from "./constants";
import { getIncompleteJobNames, getJobFilter, getPendingJobNames } from "./selectors";
import { JobFilter } from "./types";

interface Jobs {
    actualIncompleteJobNames?: string[];
    addMetadataJobs?: JSSJob[];
    copyJobs?: JSSJob[];
    error?: Error;
    inProgressUploadJobs?: JSSJob[];
    pendingJobsToRemove?: JSSJob[];
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
            return [...FAILED_STATUSES, ...SUCCESSFUL_STATUS, ...IN_PROGRESS_STATUSES];
    }
};

export const fetchJobs = async (getStateFn: () => State, jssClient: JobStatusClient): Promise<Jobs> => {
    const statusesToInclude = getJobStatusesToInclude(getJobFilter(getStateFn()));

    const potentiallyIncompleteJobNames = getIncompleteJobNames(getStateFn());
    const pendingJobNames = getPendingJobNames(getStateFn());
    const user = getLoggedInUser(getStateFn());
    const pendingJobsToRemovePromise = pendingJobNames.length ? jssClient.getJobs({
        jobName: { $in: pendingJobNames },
        serviceFields: {
            type: "upload",
        },
        status: { $in: [...FAILED_STATUSES, SUCCESSFUL_STATUS]},
        user,
    }) : Promise.resolve([]);
    const potentiallyIncompleteJobsThatSucceededPromise = potentiallyIncompleteJobNames.length ? jssClient.getJobs({
        jobName: { $in: potentiallyIncompleteJobNames },
        serviceFields: {
            type: "upload",
        },
        status: SUCCESSFUL_STATUS,
        user,
    }) : Promise.resolve([]);
    const potentiallyIncompleteJobsThatFailedPromise = potentiallyIncompleteJobNames.length ? jssClient.getJobs({
        jobName: { $in: potentiallyIncompleteJobNames },
        serviceFields: {
            type: "upload",
        },
        status: { $in: FAILED_STATUSES },
        user,
    }) : Promise.resolve([]);
    const getUploadJobsPromise = jssClient.getJobs({
        serviceFields: {
            type: "upload",
        },
        status: { $in: statusesToInclude },
        user,
    });
    const getInProgressUploadJobsPromise = jssClient.getJobs({
        serviceFields: {
            type: "upload",
        },
        status: { $in: IN_PROGRESS_STATUSES },
        user,
    });

    try {
        const [
            potentiallyIncompleteJobsThatSucceeded,
            potentiallyIncompleteJobsThatFailed,
            uploadJobs,
            pendingJobsToRemove,
            inProgressUploadJobs,
        ] = await Promise.all([
            potentiallyIncompleteJobsThatSucceededPromise,
            potentiallyIncompleteJobsThatFailedPromise,
            getUploadJobsPromise,
            pendingJobsToRemovePromise,
            getInProgressUploadJobsPromise,
        ]);
        const recentlyFailedJobNames: string[] = (potentiallyIncompleteJobsThatFailed || [])
            .map(({ jobName }: JSSJob) => `${jobName}`);
        const recentlySucceededJobNames: string[] = (potentiallyIncompleteJobsThatSucceeded || [])
            .map(({ jobName }: JSSJob) => `${jobName}`);
        const actualIncompleteJobNames = without(potentiallyIncompleteJobNames,
            ...recentlySucceededJobNames, ...recentlyFailedJobNames);

        // only get child jobs for the incomplete jobs
        const getCopyJobsPromise = jssClient.getJobs({
            jobName: { $in: actualIncompleteJobNames },
            serviceFields: {
                type: "copy",
            },
            user,
        });
        const getAddMetadataPromise = jssClient.getJobs({
            jobName: { $in: actualIncompleteJobNames },
            serviceFields: {
                type: "add_metadata",
            },
            user,
        });

        return await Promise.all([
            getCopyJobsPromise,
            getAddMetadataPromise,
        ]).then(([
                     copyJobs,
                     addMetadataJobs,
                 ]) => ({
            actualIncompleteJobNames,
            addMetadataJobs,
            copyJobs,
            inProgressUploadJobs,
            pendingJobsToRemove,
            recentlyFailedJobNames,
            recentlySucceededJobNames,
            uploadJobs,
        }));
    } catch (error) {
        return { error };
    }
};

export const mapJobsToActions = (
    getState: () => State,
    storage: LocalStorage,
    logger: Logger,
    getApplicationMenu: () => Menu | null
) =>
    (jobs: Jobs) => {
    const {
        actualIncompleteJobNames,
        addMetadataJobs,
        copyJobs,
        error,
        inProgressUploadJobs,
        pendingJobsToRemove,
        recentlyFailedJobNames,
        recentlySucceededJobNames,
        uploadJobs,
    } = jobs;
    if (error) {
        logger.error(error);
        return addEvent(`Could not retrieve jobs: ${error.message}`, AlertType.ERROR, new Date());
    }

    const actions: AnyAction[] = [];

    const pendingJobNamesToRemove: string[] = [];
    let updates: {[jobName: string]: undefined} = {};
    if (pendingJobsToRemove && !isEmpty(pendingJobsToRemove)) {
        const currentPage = getPage(getState());
        const nextPage = findNextPage(currentPage, 1);
        if (nextPage) {
            actions.push(...getSelectPageActions(
                logger,
                getState(),
                getApplicationMenu,
                selectPage(currentPage, nextPage)
            ), clearStagedFiles());
        }
        pendingJobsToRemove.forEach((job: JSSJob) => {
            pendingJobNamesToRemove.push(`${job.jobName}`);
            updates[`${DRAFT_KEY}.${job.jobName}`] = undefined;
        });
    }

    // report the status of jobs that have recently failed and succeeded
    (recentlyFailedJobNames || []).forEach((jobName: string) => {
       actions.push(
           setAlert({
               message: `${jobName} Failed`,
               type: AlertType.ERROR,
           }),
           selectJobFilter(JobFilter.Failed)
       );
    });

    (recentlySucceededJobNames || []).forEach((jobName: string) => {
        actions.push(
            setAlert({
                message: `${jobName} Succeeded`,
                type: AlertType.SUCCESS,
            }),
            selectJobFilter(JobFilter.Failed)
        );
    });

    // Only update the state if the current incompleteJobs are different than the existing ones
    const potentiallyIncompleteJobNames = getIncompleteJobNames(getState());
    if (actualIncompleteJobNames && potentiallyIncompleteJobNames.length !== actualIncompleteJobNames.length) {
        try {
            storage.set(`${JOB_STORAGE_KEY}.incompleteJobNames`, actualIncompleteJobNames);
        } catch (e) {
            logger.warn(`Failed to update incomplete job names: ${actualIncompleteJobNames.join(", ")}`);
        }
        updates = {
            ...updates,
            ...updateIncompleteJobNames(actualIncompleteJobNames).updates, // write incomplete job names to store
        };
        if (actualIncompleteJobNames.length === 0) {
            actions.push(stopJobPoll());
        }
    }
    actions.push(receiveJobs(
        uploadJobs,
        copyJobs,
        addMetadataJobs,
        pendingJobNamesToRemove,
        actualIncompleteJobNames,
        inProgressUploadJobs
    ));
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
    cancelType: STOP_JOB_POLL,
    debounce: 500,
    latest: true,
    // Redux Logic's type definitions do not include dispatching observable actions so we are setting
    // the type of dispatch to any
    process: async (deps: ReduxLogicProcessDependencies, dispatch: any, done: ReduxLogicDoneCb) => {
        const { getApplicationMenu, getState, jssClient, logger,  storage } = deps;
        const jobs = await getWithRetry(
            () => fetchJobs(getState, jssClient),
            AsyncRequest.GET_JOBS,
            dispatch,
            "JSS"
        );
        dispatch(mapJobsToActions(getState, storage, logger, getApplicationMenu)(jobs));
        done();
    },
    type: RETRIEVE_JOBS,
    warnTimeout: 0,
});

const pollJobsLogic = createLogic({
    cancelType: STOP_JOB_POLL,
    debounce: 500,
    latest: true,
    process: async (deps: ReduxLogicProcessDependencies, dispatch: any) => {
        const { getApplicationMenu, getState, jssClient, logger,  storage } = deps;
        dispatch(interval(1000)
            .pipe(
                mergeMap(() => {
                    return fetchJobs(getState, jssClient);
                }),
                map(mapJobsToActions(getState, storage, logger, getApplicationMenu))
            ));
    },
    type: START_JOB_POLL,
    warnTimeout: 0,
});

const gatherStoredIncompleteJobNamesLogic = createLogic({
    transform: ({ storage }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const incompleteJobNames = storage.get(`${JOB_STORAGE_KEY}.incompleteJobNames`) || [];
            next(updateIncompleteJobNames(incompleteJobNames));
        } catch (e) {
            next(setAlert({
                message: "Failed to get saved incomplete jobs",
                type: AlertType.WARN,
            }));
        }
    },
    type: GATHER_STORED_INCOMPLETE_JOB_NAMES,
});

export default [
    retrieveJobsLogic,
    pollJobsLogic,
    gatherStoredIncompleteJobNamesLogic,
];
