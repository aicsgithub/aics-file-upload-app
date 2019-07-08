import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { RETRIEVE_JOBS, SET_COPY_JOBS, SET_UPLOAD_JOBS } from "./constants";
import {
    RetrieveJobsAction,
    SetCopyJobsAction,
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

export function setCopyJobs(jobs: JSSJob[]): SetCopyJobsAction {
    return {
        payload: jobs,
        type: SET_COPY_JOBS,
    };
}
