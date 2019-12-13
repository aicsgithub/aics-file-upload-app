import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { intersection, isEmpty } from "lodash";
import { userInfo } from "os";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { getRequestsInProgressContains } from "../feedback/selectors";
import { AlertType, AsyncRequest } from "../feedback/types";

import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicRejectCb,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";

import { removePendingJobs, setAddMetadataJobs, setCopyJobs, setUploadJobs } from "./actions";
import { FAILED_STATUSES, PENDING_STATUSES, RETRIEVE_JOBS, SUCCESSFUL_STATUS } from "./constants";
import { getPendingJobNames } from "./selectors";
import { JobFilter } from "./types";

const convertJobDates = (j: JSSJob) => ({
    ...j,
    created: new Date(j.created),
    modified: new Date(j.modified),
});
const retrieveJobsLogic = createLogic({
    process: async ({ action, getState, jssClient }: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        try {
            const statusesToInclude = [];
            const { job: { jobFilter } } = getState();
            if (jobFilter === JobFilter.Failed || jobFilter === JobFilter.All) {
                statusesToInclude.push(...FAILED_STATUSES);
            }
            if (jobFilter === JobFilter.Successful || jobFilter === JobFilter.All) {
                statusesToInclude.push(SUCCESSFUL_STATUS);
            }
            if (jobFilter === JobFilter.Pending || jobFilter === JobFilter.All) {
                statusesToInclude.push(...PENDING_STATUSES);
            }
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

            const [uploadJobs, copyJobs, addMetadataJobs] = await Promise.all([
                getUploadJobsPromise,
                getCopyJobsPromise,
                getAddMetadataPromise,
            ]);

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

            dispatch(batchActions(actions));
            done();
        } catch (e) {
            dispatch(batchActions([
                setAlert({
                    message: "Error while retrieving jobs: " + e.message,
                    type: AlertType.ERROR,
                }),
                removeRequestFromInProgress(AsyncRequest.GET_JOBS),
            ]));
            done();
        }
    },
    type: RETRIEVE_JOBS,
    validate: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
               reject: ReduxLogicRejectCb) => {
        if (getRequestsInProgressContains(getState(), AsyncRequest.GET_JOBS)) {
            reject(action);
        } else {
            next(addRequestToInProgress(AsyncRequest.GET_JOBS));
        }
    },
});

export default [
    retrieveJobsLogic,
];
