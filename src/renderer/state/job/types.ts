import { JSSJob } from "@aics/job-status-client/type-declarations/types";

export interface JobStateBranch {
    uploadJobs: JSSJob[];
    copyJobs: JSSJob[];
    pendingJobs: number;
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

export interface IncrementPendingJobsAction {
    type: string;
}

export interface DecrementPendingJobsAction {
    type: string;
}
