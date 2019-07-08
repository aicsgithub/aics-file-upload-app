import { userInfo } from "os";
import { createLogic } from "redux-logic";
import { setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";

import { ReduxLogicNextCb, ReduxLogicTransformDependencies } from "../types";
import { setUploadJobs } from "./actions";

import { RETRIEVE_JOBS } from "./constants";

const retrieveJobsLogic = createLogic({
    transform: async ({ action, jssClient }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            // get all uploadJobs for user from jss
            // TODO in the future allow user to set params for querying for uploadJobs
            const jobs = await jssClient.getJobs({
                user: userInfo().username,
            });
            next(setUploadJobs(jobs));
        } catch (e) {
            next(setAlert({
                message: "Error while retrieving jobs: " + e.message,
                type: AlertType.ERROR,
            }));
        }
    },
    type: RETRIEVE_JOBS,
});

export default [
    retrieveJobsLogic,
];
