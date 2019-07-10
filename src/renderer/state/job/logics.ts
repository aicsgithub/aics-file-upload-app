import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { userInfo } from "os";
import { createLogic } from "redux-logic";
import { addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";

import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { setCopyJobs, setUploadJobs } from "./actions";

import { RETRIEVE_JOBS } from "./constants";

const convertJobDates = (j: JSSJob) => ({
    ...j,
    created: new Date(j.created),
    modified: new Date(j.modified),
});
const retrieveJobsLogic = createLogic({
    process: async ({ action, jssClient }: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
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

            dispatch(batchActions([
                setUploadJobs(uploadJobs.map(convertJobDates)),
                setCopyJobs(copyJobs.map(convertJobDates)),
                removeRequestFromInProgress(AsyncRequest.GET_JOBS),
            ]));
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
    transform: (deps: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
      next(addRequestToInProgress(AsyncRequest.GET_JOBS));
    },
    type: RETRIEVE_JOBS,
});

export default [
    retrieveJobsLogic,
];
