export interface JobStateBranch {
    currentJobId?: string;
    jobs: Job[];
}

// Every group of files associated with an upload represents a job.
export interface Job {
    // assigned by FSS
    jobId: string;

    // set by progress messages from aicsfiles
    status: string;

    // when the job was initiated
    created: Date;
}

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow {
    // used by antd's Table component to uniquely identify rows
    key: string;
    jobId: string;
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
