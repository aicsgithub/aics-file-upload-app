import { JobStatusClient } from "@aics/job-status-client";
import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { Menu } from "electron";
import { intersection, isEmpty, without } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { interval } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import { Error } from "tslint/lib/error";

import { JOB_STORAGE_KEY } from "../../../shared/constants";

import { addEvent, removeRequestFromInProgress, setAlert } from "../feedback/actions";
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
    removePendingJobs,
    setAddMetadataJobs,
    setCopyJobs,
    setUploadJobs,
    updateIncompleteJobNames,
} from "./actions";
import {
    FAILED_STATUSES,
    GATHER_STORED_INCOMPLETE_JOB_NAMES,
    PENDING_STATUSES,
    RETRIEVE_JOBS,
    STOP_JOB_POLL,
    SUCCESSFUL_STATUS,
} from "./constants";
import { getIncompleteJobNames, getJobFilter, getPendingJobNames } from "./selectors";
import { JobFilter } from "./types";

const convertJobDates = (j: JSSJob) => ({
    ...j,
    created: new Date(j.created),
    modified: new Date(j.modified),
});

interface Jobs {
    addMetadataJobs?: JSSJob[];
    copyJobs?: JSSJob[];
    error?: Error;
    potentiallyIncompleteJobs?: JSSJob[];
    uploadJobs?: JSSJob[];
}

export const getJobStatusesToInclude = (jobFilter: JobFilter) => {
    const statusesToInclude = [...PENDING_STATUSES];
    if (jobFilter === JobFilter.Failed || jobFilter === JobFilter.All) {
        statusesToInclude.push(...FAILED_STATUSES);
    }
    if (jobFilter === JobFilter.Successful || jobFilter === JobFilter.All) {
        statusesToInclude.push(SUCCESSFUL_STATUS);
    }
    return statusesToInclude;
};

export const fetchJobs = (getStateFn: () => State, jssClient: JobStatusClient): Promise<Jobs> => {
    const statusesToInclude = getJobStatusesToInclude(getJobFilter(getStateFn()));

    const potentiallyIncompleteJobNames = getIncompleteJobNames(getStateFn());
    const user = getLoggedInUser(getStateFn());
    const potentiallyIncompleteJobsPromise = potentiallyIncompleteJobNames.length ? jssClient.getJobs({
        jobName: { $in: potentiallyIncompleteJobNames },
        serviceFields: {
            type: "upload",
        },
        user,
    }) : Promise.resolve([]);
    const getUploadJobsPromise = jssClient.getJobs({
        serviceFields: {
            type: "upload",
        },
        status: { $in: statusesToInclude },
        user,
    });
    const getCopyJobsPromise = jssClient.getJobs({
        serviceFields: {
            type: "copy",
        },
        status: { $in: statusesToInclude },
        user,
    });
    const getAddMetadataPromise = jssClient.getJobs({
        serviceFields: {
            type: "add_metadata",
        },
        status: { $in: statusesToInclude },
        user,
    });

    return Promise.all([
        getUploadJobsPromise,
        getCopyJobsPromise,
        getAddMetadataPromise,
        potentiallyIncompleteJobsPromise,
    ]).then(([uploadJobs, copyJobs, addMetadataJobs, potentiallyIncompleteJobs]) =>
        ({uploadJobs, copyJobs, addMetadataJobs, potentiallyIncompleteJobs}))
        .catch((error) => ({ error }));
};

export const mapJobsToActions = (
    getState: () => State,
    storage: LocalStorage,
    logger: Logger,
    getApplicationMenu: () => Menu | null
) =>
    (jobs: Jobs) => {
    const {
        addMetadataJobs,
        copyJobs,
        error,
        potentiallyIncompleteJobs,
        uploadJobs,
    } = jobs;
    if (!addMetadataJobs || !copyJobs || !potentiallyIncompleteJobs || !uploadJobs) {
        const message = error ? error.message : "Could not retrieve jobs";
        return addEvent(message, AlertType.ERROR, new Date());
    }

    const uploadJobNames = uploadJobs.map((job: JSSJob) => job.jobName);
    const pendingJobNames = getPendingJobNames(getState());
    const pendingJobsToRemove: string[] = intersection(uploadJobNames, pendingJobNames)
        .filter((name) => !!name) as string[];

    const actions: AnyAction[] = [
        setUploadJobs(uploadJobs.map(convertJobDates)),
        setCopyJobs(copyJobs.map(convertJobDates)),
        setAddMetadataJobs(addMetadataJobs.map(convertJobDates)),
        removeRequestFromInProgress(AsyncRequest.GET_JOBS),
    ];

    if (!isEmpty(pendingJobsToRemove)) {
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
        actions.push(removePendingJobs(pendingJobsToRemove));
    }
    // If there are potentially incomplete jobs, see if they are actually completed
    // so we can report the status
    const incompleteJobNames = getIncompleteJobNames(getState());
    if (incompleteJobNames.length) {
        // Gather the actually incompleteJobs from the list of jobs that previously were incomplete

        const latestIncompleteJobNames = potentiallyIncompleteJobs.filter((job) => {
            if (job.jobName && pendingJobsToRemove.includes(job.jobName)) {
                return false;
            }
            if (job.status === SUCCESSFUL_STATUS) {
                actions.push(setAlert({
                    message: `${job.jobName} Succeeded`,
                    type: AlertType.SUCCESS,
                }));
                return false;
            }
            if (FAILED_STATUSES.includes(job.status)) {
                actions.push(setAlert({
                    message: `${job.jobName} Failed`,
                    type: AlertType.ERROR,
                }));
                return false;
            }
            // If job is still pending then it might not be the right job based on name alone,
            // so hold off
            return true;
        }).map(({jobName}) => jobName);
        latestIncompleteJobNames.push(...without(pendingJobNames, ...pendingJobsToRemove));
        // Only update the state if the current incompleteJobs are different than the existing ones
        const potentiallyIncompleteJobNames = getIncompleteJobNames(getState());
        if (potentiallyIncompleteJobNames.length !== latestIncompleteJobNames.length) {
            try {
                storage.set(`${JOB_STORAGE_KEY}.incompleteJobNames`, latestIncompleteJobNames);
            } catch (e) {
                actions.push(
                    setAlert({
                        message: "Failed to update incomplete job names",
                        type: AlertType.WARN,
                    })
                );
            }
            actions.push(updateIncompleteJobNames(latestIncompleteJobNames.filter((n) => !!n) as string[]));
        }
    }

    let nextAction: AnyAction = batchActions(actions);
    if (!isEmpty(pendingJobsToRemove)) {
        // delete drafts that are no longer pending
        const updates = pendingJobsToRemove.reduce((accum: {[key: string]: any}, curr: string) => ({
            ...accum,
            [`${DRAFT_KEY}.${curr}`]: undefined,
        }), {});
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
        dispatch(interval(1000)
            .pipe(
                mergeMap(() => {
                    return fetchJobs(getState, jssClient);
                }),
                map(mapJobsToActions(getState, storage, logger, getApplicationMenu))
            ));
    },
    type: RETRIEVE_JOBS,
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
    gatherStoredIncompleteJobNamesLogic,
];
