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

    // set by progress messages from aicsfiles. Gives more detailed information about where the upload is at
    stage: string;

    // when the job was initiated.
    created: Date;

    // whether copy is complete
    copyComplete: boolean;

    // status of the job
    status: JobStatus;
}

export enum JobStatus {
    NOT_STARTED = "NOT_STARTED", // This will get used for drafts eventually when saving drafts is possible
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETE = "COMPLETE",
    FAILED = "FAILED",
}

export interface UpdateJobAction {
    payload: {
        jobName: string;
        job: Partial<Job>;
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
