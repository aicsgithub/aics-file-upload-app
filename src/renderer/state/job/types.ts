import { Uploads } from "@aics/aicsfiles/type-declarations/types";
import { JSSJob } from "@aics/job-status-client/type-declarations/types";

export interface JobStateBranch {
    uploadJobs: JSSJob[];
    copyJobs: JSSJob[];
    addMetadataJobs: JSSJob[];
    incompleteJobs: string[];
    jobFilter: JobFilter;
    pendingJobs: PendingJob[];
}

// When a user submits an upload, a job doesn't get created right away so the job is stored
// in this form first
export interface PendingJob extends JSSJob {
    uploads: Uploads;
}

export enum JobFilter {
    All = "All",
    Failed = "Failed",
    Pending = "Pending",
    Successful = "Successful",
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

export interface SetAddMetadataJobsAction {
    payload: JSSJob[];
    type: string;
}

export interface GatherIncompleteJobsAction {
    type: string;
}

export interface UpdateIncompleteJobsAction {
    payload: string[];
    type: string;
}

export interface AddPendingJobAction {
    payload: PendingJob;
    type: string;
}

export interface RemovePendingJobsAction {
    payload: string[]; // jobNames
    type: string;
}

export interface SelectJobFilterAction {
    payload: JobFilter;
    type: string;
}
