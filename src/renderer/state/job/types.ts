import { JSSJob } from "@aics/job-status-client/type-declarations/types";

export interface JobStateBranch {
    uploadJobs: JSSJob[];
}

export interface RetrieveJobsAction {
    type: string;
}

export interface SetJobsAction {
    payload: JSSJob[];
    type: string;
}