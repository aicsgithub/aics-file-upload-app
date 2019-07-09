import { JSSJob } from "@aics/job-status-client/type-declarations/types";

export interface JobStateBranch {
    uploadJobs: JSSJob[];
    copyJobs: JSSJob[];
    pendingJobs: string[];
}

export interface RetrieveJobsAction {
    type: string;
}

export interface SetUploadJobsAction {
    payload: JSSJob[];
    type: string;
}

export interface SetCopyJobsAction {
    payload: JSSJob[];
    type: string;
}

export interface AddPendingJobAction {
    payload: string; // jobName
    type: string;
}

export interface RemovePendingJobAction {
    payload: string; // jobName
    type: string;
}
