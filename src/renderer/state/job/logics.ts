import { findIndex } from "lodash";
import { createLogic } from "redux-logic";

import { ReduxLogicNextCb, ReduxLogicTransformDependencies } from "../types";
import { setJobs } from "./actions";
import { SET_UPLOAD_STATUS } from "./constants";
import { getJobs } from "./selectors";

const setUploadStatusLogic = createLogic({
    transform: ({ action, getState }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const {jobName, status} = action.payload;
        const state = getState();
        const jobs = [...getJobs(state)];
        const jobIndex = findIndex(jobs, {name: jobName});
        const jobToModify = jobs[jobIndex];
        if (jobToModify) {
            jobs[jobIndex] = {
                ...jobToModify,
                status,
            };
            next(setJobs(jobs));
        } else {
            next(action);
            throw Error("Upload status cannot be updated because there is no current job!"); // todo custom error?
        }

    },
    type: SET_UPLOAD_STATUS,
});

export default [
    setUploadStatusLogic,
];
