import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import {
    ADD_PENDING_JOB,
    REMOVE_PENDING_JOB,
    RETRIEVE_JOBS,
    SET_COPY_JOBS,
    SET_UPLOAD_JOBS,
} from "./constants";
import {
    AddPendingJobAction,
    RemovePendingJobAction,
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

export function addPendingJob(jobName: string): AddPendingJobAction {
    return {
        payload: jobName,
        type: ADD_PENDING_JOB,
    };
}

export function removePendingJob(jobName: string): RemovePendingJobAction {
    return {
        payload: jobName,
        type: REMOVE_PENDING_JOB,
    };
}
