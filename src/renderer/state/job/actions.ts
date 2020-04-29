import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { INCOMPLETE_JOB_NAMES_KEY } from "../../../shared/constants";
import {
    ADD_PENDING_JOB,
    GATHER_STORED_INCOMPLETE_JOB_NAMES,
    RECEIVE_JOBS,
    REMOVE_PENDING_JOB,
    RETRIEVE_JOBS,
    SELECT_JOB_FILTER,
    START_JOB_POLL,
    STOP_JOB_POLL,
    UPDATE_INCOMPLETE_JOB_NAMES,
} from "./constants";
import {
    AddPendingJobAction,
    GatherIncompleteJobNamesAction,
    JobFilter,
    PendingJob,
    ReceiveJobsAction,
    RemovePendingJobsAction,
    RetrieveJobsAction,
    SelectJobFilterAction,
    StartJobPollAction,
    StopJobPollAction,
    UpdateIncompleteJobNamesAction,
} from "./types";

export function retrieveJobs(): RetrieveJobsAction {
    return {
        type: RETRIEVE_JOBS,
    };
}

export function receiveJobs(
    uploadJobs: JSSJob[] = [],
    copyJobs: JSSJob[] = [],
    addMetadataJobs: JSSJob[] = [],
    pendingJobNamesToRemove: string[] = [],
    incompleteJobNames: string[] = [],
    inProgressUploadJobs: JSSJob[] = []
): ReceiveJobsAction {
    return {
        payload: {
            addMetadataJobs,
            copyJobs,
            inProgressUploadJobs,
            incompleteJobNames,
            pendingJobNamesToRemove,
            uploadJobs,
        },
        type: RECEIVE_JOBS,
    };
}

export function gatherIncompleteJobNames(): GatherIncompleteJobNamesAction {
    return {
        type: GATHER_STORED_INCOMPLETE_JOB_NAMES,
    };
}

export function updateIncompleteJobNames(incompleteJobNames: string[]): UpdateIncompleteJobNamesAction {
    return {
        payload: incompleteJobNames,
        type: UPDATE_INCOMPLETE_JOB_NAMES,
        updates: {
            [INCOMPLETE_JOB_NAMES_KEY]: incompleteJobNames,
        },
        writeToStore: true,
    };
}

export function addPendingJob(job: PendingJob): AddPendingJobAction {
    return {
        payload: job,
        type: ADD_PENDING_JOB,
    };
}

export function removePendingJobs(jobNames: string[]): RemovePendingJobsAction {
    return {
        payload: jobNames,
        type: REMOVE_PENDING_JOB,
    };
}

export function selectJobFilter(jobFilter: JobFilter): SelectJobFilterAction {
    return {
        payload: jobFilter,
        type: SELECT_JOB_FILTER,
    };
}

export function startJobPoll(): StartJobPollAction {
    return {
        type: START_JOB_POLL,
    };
}

export function stopJobPoll(): StopJobPollAction {
    return {
        type: STOP_JOB_POLL,
    };
}
