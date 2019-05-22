export interface JobStateBranch {
    currentJobId?: string;
    jobs: Job[];
}

export interface Job {
    key: string;
    jobId?: string; // current upload not defined until get Job ID back from FMS
    status: string;
    created: Date;
}

export interface UploadSummaryTableRow {
    key: string;
    jobId?: string; // current upload not defined until get Job ID back from FMS
    status: string;
    created: string;
}

export interface SetUploadStatusAction {
    payload: string;
    type: string;
}

export interface SetJobsAction {
    payload: Job[];
    type: string;
}

export interface AddJobAction {
    payload: Job;
    type: string;
}

export interface SetCurrentJobIdAction {
    payload: string;
    type: string;
}
