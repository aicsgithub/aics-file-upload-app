import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { LabkeyTemplate } from "../../util/labkey-client/types";

import { Channel } from "../metadata/types";
import { Workflow } from "../selection/types";

import {
    APPLY_TEMPLATE,
    ASSOCIATE_FILES_AND_WELLS,
    ASSOCIATE_FILES_AND_WORKFLOWS,
    CANCEL_UPLOAD,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOADS,
    INITIATE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    RETRY_UPLOAD,
    UNDO_FILE_WELL_ASSOCIATION,
    UNDO_FILE_WORKFLOW_ASSOCIATION,
    UPDATE_FILES_TO_ARCHIVE,
    UPDATE_FILES_TO_STORE_ON_ISILON,
    UPDATE_SCENES,
    UPDATE_UPLOAD,
    UPDATE_UPLOADS,
} from "./constants";
import {
    ApplyTemplateAction,
    AssociateFilesAndWellsAction,
    AssociateFilesAndWorkflowsAction,
    CancelUploadAction,
    ClearUploadHistoryAction,
    FilepathToBoolean,
    InitiateUploadAction,
    JumpToPastUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    RetryUploadAction,
    UndoFileWellAssociationAction,
    UndoFileWorkflowAssociationAction,
    UpdateFilesToArchive,
    UpdateFilesToStoreOnIsilon,
    UpdateScenesAction,
    UpdateUploadAction,
    UpdateUploadsAction,
    UploadJobTableRow,
    UploadMetadata,
} from "./types";

export function associateFilesAndWells(fullPaths: string[], wellIds: number[], wellLabels: string[])
    : AssociateFilesAndWellsAction {
    return {
        payload: {
            barcode: "",
            fullPaths,
            wellIds,
            wellLabels,
        },
        type: ASSOCIATE_FILES_AND_WELLS,
    };
}

export function undoFileWellAssociation(fullPath: string, wellIds: number[], wellLabels: string[])
    : UndoFileWellAssociationAction {
    return {
        payload: {
            fullPath,
            wellIds,
            wellLabels,
        },
        type: UNDO_FILE_WELL_ASSOCIATION,
    };
}

export function associateFilesAndWorkflows(fullPaths: string[], workflows: Workflow[])
    : AssociateFilesAndWorkflowsAction {
    return {
        payload: {
            fullPaths,
            workflows,
        },
        type: ASSOCIATE_FILES_AND_WORKFLOWS,
    };
}

export function undoFileWorkflowAssociation(fullPath: string, workflows: Workflow[])
    : UndoFileWorkflowAssociationAction {
    return {
        payload: {
            fullPath,
            workflows,
        },
        type: UNDO_FILE_WORKFLOW_ASSOCIATION,
    };
}

export function jumpToPastUpload(index: number): JumpToPastUploadAction {
    return {
        index,
        type: JUMP_TO_PAST_UPLOAD,
    };
}

export function jumpToUpload(index: number): JumpToUploadAction {
    return {
        index,
        type: JUMP_TO_UPLOAD,
    };
}

export function clearUploadHistory(): ClearUploadHistoryAction {
    return {
        type: CLEAR_UPLOAD_HISTORY,
    };
}

export function removeUploads(fullPaths: string[]): RemoveUploadsAction {
    return {
        payload: fullPaths,
        type: DELETE_UPLOADS,
    };
}

export function initiateUpload(): InitiateUploadAction {
    return {
        type: INITIATE_UPLOAD,
    };
}

export function applyTemplate(template: LabkeyTemplate): ApplyTemplateAction {
    return {
        payload: {
            template,
            uploads: {},
        },
        type: APPLY_TEMPLATE,
    };
}

export function updateUpload(key: string, upload: Partial<UploadMetadata>): UpdateUploadAction {
    return {
        payload: {
            key,
            upload,
        },
        type: UPDATE_UPLOAD,
    };
}

export function cancelUpload(job: UploadSummaryTableRow): CancelUploadAction {
    return {
        payload: job,
        type: CANCEL_UPLOAD,
    };
}

export function retryUpload(job: UploadSummaryTableRow): RetryUploadAction {
    return {
        payload: job,
        type: RETRY_UPLOAD,
    };
}

export function updateUploads(upload: Partial<UploadMetadata>): UpdateUploadsAction {
    return {
        payload: upload,
        type: UPDATE_UPLOADS,
    };
}

export function updateScenes(row: UploadJobTableRow, positionIndexes: number[], channels: Channel[]):
    UpdateScenesAction {
    return {
        payload: {
            channels,
            positionIndexes,
            row,
        },
        type: UPDATE_SCENES,
    };
}

export function updateFilesToArchive(filesToArchive: FilepathToBoolean): UpdateFilesToArchive {
    return {
        payload: filesToArchive,
        type: UPDATE_FILES_TO_ARCHIVE,
    };
}

export function updateFilesToStoreOnIsilon(filesToStoreOnIsilon: FilepathToBoolean):
    UpdateFilesToStoreOnIsilon {
    return {
        payload: filesToStoreOnIsilon,
        type: UPDATE_FILES_TO_STORE_ON_ISILON,
    };
}
