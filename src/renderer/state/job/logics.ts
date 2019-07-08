import { createLogic } from "redux-logic";

import { ReduxLogicNextCb, ReduxLogicTransformDependencies } from "../types";

import { UPDATE_JOB } from "./constants";

const updateJobLogic = createLogic({
    transform: ({ action, getState }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        // const { jobName, job } = action.payload;
        // const jobs = [...getJobs(getState())];
        // const index = findIndex(jobs, {name: jobName});
        // const jobToModify = jobs[index];
        // if (jobToModify) {
        //     jobs[index] = {
        //         ...jobToModify,
        //         ...omit(job, ["name"]), // name acts as an id so it would be unsafe to change it
        //     };
        next(action);
        // } else {
        //     next(action);
        //     throw new JobDoesNotExistError();
        // }
    },
    type: UPDATE_JOB,
});

export default [
    updateJobLogic,
];
