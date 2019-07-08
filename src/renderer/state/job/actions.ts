import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { RETRIEVE_JOBS, SET_JOBS } from "./constants";
import {
    RetrieveJobsAction,
    SetJobsAction,
} from "./types";

export function retrieveJobs(): RetrieveJobsAction {
    return {
        type: RETRIEVE_JOBS,
    };
}

export function setJobs(jobs: JSSJob[]): SetJobsAction {
    return {
        payload: jobs,
        type: SET_JOBS,
    };
}