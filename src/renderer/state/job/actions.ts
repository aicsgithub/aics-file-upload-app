import { ADD_JOB, SET_CURRENT_JOB_NAME, SET_JOBS, SET_UPLOAD_STATUS } from "./constants";
import { AddJobAction, Job, SetCurrentJobNameAction, SetJobsAction, SetUploadStatusAction } from "./types";

export function setUploadStatus(jobName: string, status: string): SetUploadStatusAction {
    return {
        payload: {jobName, status},
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

export function setCurrentJobName(jobName: string): SetCurrentJobNameAction {
    return {
        payload: jobName,
        type: SET_CURRENT_JOB_NAME,
    };
}
