import { Uploads } from "@aics/aicsfiles/type-declarations/types";
import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { WriteToStoreAction } from "../types";

export interface JobStateBranch {
    // Parent job representing an upload of a batch of files
    uploadJobs: JSSJob[];
    // Parent upload jobs that are in progress
    inProgressUploadJobs: JSSJob[];
    // Child job representing the copy step of an upload job
    copyJobs: JSSJob[];
    // Child job representing the add metadata step of an upload job
    addMetadataJobs: JSSJob[];
    // List of upload jobs that are either pending (no FSS Job Id yet) or in-progress (has FSS Job Id)
    incompleteJobNames: string[];
    // Represents which filter has been selected on the Upload Summary page
    jobFilter: JobFilter;
    // Jobs where the user has initiated an upload but do not have FSS Job Id yet
    pendingJobs: PendingJob[];
    // Whether the app is polling for jobs
    polling: boolean;
}

// When a user submits an upload, a job doesn't get created right away so the job is stored
// in this form first
export interface PendingJob extends JSSJob {
    uploads: Uploads;
}

export enum JobFilter {
    All = "All",
    Failed = "Failed",
    InProgress = "In Progress",
    Successful = "Successful",
}

export interface RetrieveJobsAction {
    type: string;
}

export interface ReceiveJobsAction {
    payload: {
        addMetadataJobs: JSSJob[];
        copyJobs: JSSJob[];
        incompleteJobNames: string[];
        inProgressUploadJobs: JSSJob[];
        pendingJobNamesToRemove: string[];
        uploadJobs: JSSJob[];
    };
    type: string;
}

export interface GatherIncompleteJobNamesAction {
    type: string;
}

export interface UpdateIncompleteJobNamesAction extends WriteToStoreAction {
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

export interface StopJobPollAction {
    type: string;
}

export interface StartJobPollAction {
    type: string;
}
