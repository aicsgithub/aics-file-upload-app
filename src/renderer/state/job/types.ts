export interface JobStateBranch {
    currentJobId?: string;
    jobs: Job[];
}

// Every group of files associated with an upload represents a job.
export interface Job {
    // used by antd's Table component to uniquely identify rows
    key: string;

    // assigned by FSS
    jobId: string;

    // set by progress messages from aicsfiles
    status: string;

    // when the job was initiated
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
