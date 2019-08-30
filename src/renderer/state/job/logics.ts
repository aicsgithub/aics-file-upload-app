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
import { removePendingJobs, setCopyJobs, setUploadJobs } from "./actions";

import { RETRIEVE_JOBS } from "./constants";
import { getPendingJobNames } from "./selectors";

const convertJobDates = (j: JSSJob) => ({
    ...j,
    created: new Date(j.created),
    modified: new Date(j.modified),
});
const retrieveJobsLogic = createLogic({
    process: async ({ action, getState, jssClient }: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        try {
            // get all uploadJobs for user from jss
            // TODO in the future allow user to set params for querying for uploadJobs
            const getUploadJobsPromise = jssClient.getJobs({
                serviceFields: {
                    type: "upload",
                },
                user: userInfo().username,

            });
            const getCopyJobsPromise = jssClient.getJobs({
                serviceFields: {
                    type: "copy",
                },
                user: userInfo().username,
            });

            const [uploadJobs, copyJobs] = await Promise.all([getUploadJobsPromise, getCopyJobsPromise]);

            const uploadJobNames = uploadJobs.map((job: JSSJob) => job.jobName);
            const pendingJobNames = getPendingJobNames(getState());
            const pendingJobsToRemove: string[] = intersection(uploadJobNames, pendingJobNames)
                .filter((name) => !!name) as string[];

            const actions: AnyAction[] = [
                setUploadJobs(uploadJobs.map(convertJobDates)),
                setCopyJobs(copyJobs.map(convertJobDates)),
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
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
                reject: ReduxLogicRejectCb) => {
        if (getRequestsInProgressContains(getState(), AsyncRequest.GET_JOBS)) {
            reject();
        } else {
            next(addRequestToInProgress(AsyncRequest.GET_JOBS));
        }
    },
    type: RETRIEVE_JOBS,
});

export default [
    retrieveJobsLogic,
];
