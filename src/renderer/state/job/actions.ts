import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { INCOMPLETE_JOB_IDS_KEY } from "../../../shared/constants";
import {
    GATHER_STORED_INCOMPLETE_JOB_IDS,
    RECEIVE_JOBS,
    RETRIEVE_JOBS,
    SELECT_JOB_FILTER,
    START_JOB_POLL,
    STOP_JOB_POLL,
    UPDATE_INCOMPLETE_JOB_IDS,
} from "./constants";
import {
    GatherIncompleteJobIdsAction,
    JobFilter,
    ReceiveJobsAction,
    RetrieveJobsAction,
    SelectJobFilterAction,
    StartJobPollAction,
    StopJobPollAction,
    UpdateIncompleteJobIdsAction,
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
    incompleteJobIds: string[] = [],
    inProgressUploadJobs: JSSJob[] = []
): ReceiveJobsAction {
    return {
        payload: {
            addMetadataJobs,
            copyJobs,
            inProgressUploadJobs,
            incompleteJobIds,
            uploadJobs,
        },
        type: RECEIVE_JOBS,
    };
}

export function gatherIncompleteJobIds(): GatherIncompleteJobIdsAction {
    return {
        type: GATHER_STORED_INCOMPLETE_JOB_IDS,
    };
}

export function updateIncompleteJobIds(incompleteJobIds: string[]): UpdateIncompleteJobIdsAction {
    return {
        payload: incompleteJobIds,
        type: UPDATE_INCOMPLETE_JOB_IDS,
        updates: {
            [INCOMPLETE_JOB_IDS_KEY]: incompleteJobIds,
        },
        writeToStore: true,
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
