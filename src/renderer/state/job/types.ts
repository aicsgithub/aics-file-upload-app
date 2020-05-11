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
    // List of upload jobs that may or may not be in-progress - used for reporting on jobs that succeed or failed on app
    // startup
    incompleteJobIds: string[];
    // Represents which filter has been selected on the Upload Summary page
    jobFilter: JobFilter;
    // Whether the app is polling for jobs
    polling: boolean;
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
        incompleteJobIds: string[];
        inProgressUploadJobs: JSSJob[];
        uploadJobs: JSSJob[];
    };
    type: string;
}

export interface GatherIncompleteJobIdsAction {
    type: string;
}

export interface UpdateIncompleteJobIdsAction extends WriteToStoreAction {
    payload: string[];
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
    payload?: JobFilter;
    type: string;
}
