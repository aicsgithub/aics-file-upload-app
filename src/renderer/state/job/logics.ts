import { createLogic } from "redux-logic";

import { ReduxLogicNextCb, ReduxLogicTransformDependencies } from "../types";
import { setJobs } from "./actions";
import { SET_UPLOAD_STATUS } from "./constants";
import { getCurrentJob, getCurrentJobIndex, getJobs } from "./selectors";

const setUploadStatusLogic = createLogic({
    transform: ({ action, getState }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const state = getState();
        const jobs = [...getJobs(state)];
        const currentJob = getCurrentJob(state);
        const jobIndex = getCurrentJobIndex(state);
        if (jobIndex  > -1 && currentJob) {
            jobs[jobIndex] = {
                ...currentJob,
                status: action.payload,
            };
            next(setJobs(jobs));
        } else {
            throw Error("Upload status cannot be updated because there is no current job!");
        }

    },
    type: SET_UPLOAD_STATUS,
});

export default [
    setUploadStatusLogic,
];
