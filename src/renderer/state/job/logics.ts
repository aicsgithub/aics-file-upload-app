import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { intersection, isEmpty } from "lodash";
import { userInfo } from "os";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { interval, of, Subject } from "rxjs";
import { catchError, finalize, map, mergeMap } from "rxjs/operators";

import { JOB_STORAGE_KEY } from "../../../shared/constants";

import { removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";

import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
    State,
} from "../types";
import { batchActions } from "../util";

import {
    removePendingJobs,
    retrieveJobs,
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
    START_JOB_POLL,
    STOP_JOB_POLL,
    SUCCESSFUL_STATUS,
    UPDATE_INCOMPLETE_JOB_NAMES,
} from "./constants";
import { getIncompleteJobNames, getPendingJobNames } from "./selectors";
import { JobFilter } from "./types";

const convertJobDates = (j: JSSJob) => ({
    ...j,
    created: new Date(j.created),
    modified: new Date(j.modified),
});

const fetchJobsFn = (getStateFn: any, jssClient: any) => {
    const statusesToInclude = [...PENDING_STATUSES];
    const state = getStateFn();
    const { job: { jobFilter } } = state;
    if (jobFilter === JobFilter.Failed || jobFilter === JobFilter.All) {
        statusesToInclude.push(...FAILED_STATUSES);
    }
    if (jobFilter === JobFilter.Successful || jobFilter === JobFilter.All) {
        statusesToInclude.push(SUCCESSFUL_STATUS);
    }
    if (jobFilter === JobFilter.Pending || jobFilter === JobFilter.All) {
        statusesToInclude.push(...PENDING_STATUSES);
    }

    const potentiallyIncompleteJobNames = getIncompleteJobNames(getStateFn());
    const potentiallyIncompleteJobsPromise = potentiallyIncompleteJobNames.length ? jssClient.getJobs({
        jobName: { $in: potentiallyIncompleteJobNames },
        serviceFields: {
            type: "upload",
        },
        user: userInfo().username,
    }) : Promise.resolve([]);
    const getUploadJobsPromise = jssClient.getJobs({
        serviceFields: {
            type: "upload",
        },
        status: { $in: statusesToInclude },
        user: userInfo().username,

    });
    const getCopyJobsPromise = jssClient.getJobs({
        serviceFields: {
            type: "copy",
        },
        status: { $in: statusesToInclude },
        user: userInfo().username,
    });
    const getAddMetadataPromise = jssClient.getJobs({
        serviceFields: {
            type: "add_metadata",
        },
        status: { $in: statusesToInclude },
        user: userInfo().username,
    });

    return Promise.all([
        getUploadJobsPromise,
        getCopyJobsPromise,
        getAddMetadataPromise,
        potentiallyIncompleteJobsPromise,
    ]).then(([uploadJobs, copyJobs, addMetadataJobs, potentiallyIncompleteJobs]) =>
        ({uploadJobs, copyJobs, addMetadataJobs, potentiallyIncompleteJobs}));
};

const retrieveJobsLogic = createLogic({
    cancelType: STOP_JOB_POLL,
    debounce: 500,
    latest: true,
    process: async ({ action, getState, jssClient }: ReduxLogicProcessDependencies, dispatch: any,
                    done: ReduxLogicDoneCb) => {
        dispatch(interval(1000)
            .pipe(
                mergeMap(() => {
                    return fetchJobsFn(getState, jssClient);
                }),
                map(({
                         addMetadataJobs,
                         copyJobs,
                         potentiallyIncompleteJobs,
                         uploadJobs}: any) => {
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
                        actions.push(removePendingJobs(pendingJobsToRemove));
                    }
                    // If there are potentially incomplete jobs, see if they are actually completed
                    // so we can report the status
                    if (potentiallyIncompleteJobs.length) {
                        // We want to check the newest job in the event there are jobs with the same name
                        let newestPotentiallyIncompleteJobs: JSSJob[] = [];
                        potentiallyIncompleteJobs.forEach((job: JSSJob) => {
                            // See if we have already have a job with this name
                            const matchingJob = newestPotentiallyIncompleteJobs.find(({ jobName }) => (
                                jobName === job.jobName
                            ));
                            if (!matchingJob) {
                                newestPotentiallyIncompleteJobs.push(job);
                            } else if (job.created > matchingJob.created) {
                                // If we did have a job with this name already and the
                                // current job is newer replace the old one
                                newestPotentiallyIncompleteJobs = [
                                    ...newestPotentiallyIncompleteJobs.filter(({ jobName }) => (
                                    jobName !== job.jobName
                                )), job];
                            }
                        });
                        // Gather the actually incompleteJobs from the list of jobs that previously were incomplete
                        const incompleteJobs = newestPotentiallyIncompleteJobs.filter((job) => {
                            // If job is still pending then it might not be the right job based on name alone,
                            // so hold off
                            if (pendingJobNames.includes(job.jobName)) {
                                return true;
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
                            return true;
                        });
                        // Only update the state if the current incompleteJobs are different than the existing ones
                        const potentiallyIncompleteJobNames = getIncompleteJobNames(getState());
                        if (potentiallyIncompleteJobNames.length !== incompleteJobs.length) {
                            const incompleteJobNames = incompleteJobs.map((job) => job.jobName || "");
                            actions.push(updateIncompleteJobNames(incompleteJobNames));
                        }
                    }

                    return(batchActions(actions));
                }),
                catchError((err: any) =>
                    of(setAlert({
                        message: "error!" + err.message,
                        type: AlertType.ERROR,
                    }))
                )
            ));
    },
    type: RETRIEVE_JOBS,
    warnTimeout: 0,
});

const updateIncompleteJobNamesLogic = createLogic({
    transform: ({ action, storage }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            storage.set(`${JOB_STORAGE_KEY}.incompleteJobNames`, action.payload || []);
            next(action);
        } catch (e) {
            next(batchActions([
                action,
                setAlert({
                    message: "Failed to persist settings",
                    type: AlertType.WARN,
                }),
            ]));
        }
    },
    type: UPDATE_INCOMPLETE_JOB_NAMES,
});

const gatherStoredIncompleteJobNamesLogic = createLogic({
    transform: ({ storage }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const incompleteJobNames = storage.get(`${JOB_STORAGE_KEY}.incompleteJobNames`);
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

const startJobPollLogic = createLogic({
    latest: true,
    process: ({ action, getState, jssClient }: ReduxLogicProcessDependencies,
              dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        dispatch(retrieveJobs());
        done();
    },
    type: START_JOB_POLL,
});

export default [
    retrieveJobsLogic,
    gatherStoredIncompleteJobNamesLogic,
    updateIncompleteJobNamesLogic,
    startJobPollLogic,
];
