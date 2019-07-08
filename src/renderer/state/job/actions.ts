import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { RETRIEVE_JOBS, SET_UPLOAD_JOBS } from "./constants";
import {
    RetrieveJobsAction,
    SetUploadJobsAction,
} from "./types";

export function retrieveJobs(): RetrieveJobsAction {
    return {
        type: RETRIEVE_JOBS,
    };
}

export function setUploadJobs(jobs: JSSJob[]): SetUploadJobsAction {
    return {
        payload: jobs,
        type: SET_UPLOAD_JOBS,
    };
}
