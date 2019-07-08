import { JSSJob } from "@aics/job-status-client/type-declarations/types";

export interface JobStateBranch {
    jobs: JSSJob[];
}

// TODO Remove?
export enum JobStatus {
    NOT_STARTED = "NOT_STARTED", // This will get used for drafts eventually when saving drafts is possible
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETE = "COMPLETE",
    FAILED = "FAILED",
}

export interface RetrieveJobsAction {
    type: string;
}

export interface SetJobsAction {
    payload: JSSJob[];
    type: string;
}