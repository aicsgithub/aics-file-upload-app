export interface JobStateBranch {
    currentJobName?: string;
    jobs: Job[];
}

// Every group of files associated with an upload represents a job.
export interface Job {
    // assigned by FSS
    jobId: string;

    // name of job. Constructed from date created and acts as an ID since jobId's assigned by FSS don't get created
    // until after the request is validated by aicsfiles
    name: string;

    // set by progress messages from aicsfiles
    status: string;

    // when the job was initiated.
    created: Date;
}

export interface SetUploadStatusAction {
    payload: {
        jobName: string;
        status: string;
    };
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

export interface SetCurrentJobNameAction {
    payload: string;
    type: string;
}
