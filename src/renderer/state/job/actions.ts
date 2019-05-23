import { ADD_JOB, SET_CURRENT_JOB_ID, SET_JOBS, SET_UPLOAD_STATUS } from "./constants";
import { AddJobAction, Job, SetCurrentJobIdAction, SetJobsAction, SetUploadStatusAction } from "./types";

export function setUploadStatus(status: string): SetUploadStatusAction {
    return {
        payload: status,
        type: SET_UPLOAD_STATUS,
    };
}

export function setJobs(jobs: Job[]): SetJobsAction {
    return {
        payload: jobs,
        type: SET_JOBS,
    };
}

export function addJob(job: Job): AddJobAction {
    return {
        payload: job,
        type: ADD_JOB,
    };
}

export function setCurrentJobId(jobId: string): SetCurrentJobIdAction {
    return {
        payload: jobId,
        type: SET_CURRENT_JOB_ID,
    };
}
