import { ADD_JOB, SET_JOBS, UPDATE_JOB } from "./constants";
import {
    AddJobAction,
    Job,
    SetJobsAction,
    UpdateJobAction,
} from "./types";

export function updateJob(jobName: string, job: Partial<Job>): UpdateJobAction {
    return {
        payload: {jobName, job},
        type: UPDATE_JOB,
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
