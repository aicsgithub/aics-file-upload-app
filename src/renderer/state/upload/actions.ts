import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { Workflow } from "../selection/types";

import {
    APPLY_TEMPLATE,
    ASSOCIATE_FILES_AND_WELLS,
    ASSOCIATE_FILES_AND_WORKFLOWS,
    CANCEL_UPLOAD,
    CLEAR_UPLOAD,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOADS,
    INITIATE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    REMOVE_FILE_FROM_ARCHIVE,
    REMOVE_FILE_FROM_ISILON,
    RETRY_UPLOAD,
    UNDO_FILE_WELL_ASSOCIATION,
    UNDO_FILE_WORKFLOW_ASSOCIATION,
    UPDATE_FILES_TO_ARCHIVE,
    UPDATE_FILES_TO_STORE_ON_ISILON,
    UPDATE_SUB_IMAGES,
    UPDATE_UPLOAD,
    UPDATE_UPLOADS,
} from "./constants";
import {
    ApplyTemplateAction,
    AssociateFilesAndWellsAction,
    AssociateFilesAndWorkflowsAction,
    CancelUploadAction,
    ClearUploadAction,
    ClearUploadHistoryAction,
    FilepathToBoolean,
    InitiateUploadAction,
    JumpToPastUploadAction,
    JumpToUploadAction,
    RemoveFileFromArchiveAction,
    RemoveFileFromIsilonAction,
    RemoveUploadsAction,
    RetryUploadAction,
    UndoFileWellAssociationAction,
    UndoFileWorkflowAssociationAction,
    UpdateFilesToArchive,
    UpdateFilesToStoreOnIsilon,
    UpdateSubImagesAction,
    UpdateSubImagesPayload,
    UpdateUploadAction,
    UpdateUploadsAction,
    UploadJobTableRow,
    UploadMetadata,
    UploadRowId,
} from "./types";

export function associateFilesAndWells(rowIds: UploadRowId[]): AssociateFilesAndWellsAction {

    return {
        payload: {
            barcode: "",
            rowIds,
            wellIds: [], // this gets populated with the wells that are selected in logics
        },
        type: ASSOCIATE_FILES_AND_WELLS,
    };
}

// For undoing the well associations for a single upload row
export function undoFileWellAssociation(
    rowId: UploadRowId,
    deleteUpload: boolean = true,
    wellIds: number[] = []
): UndoFileWellAssociationAction {
    return {
        payload: {
            deleteUpload,
            rowId,
            wellIds, // if empty, this gets populated with the wells that are selected in logics
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

export function applyTemplate(templateId: number): ApplyTemplateAction {
    return {
        payload: {
            templateId,
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

export function updateSubImages(
    row: UploadJobTableRow,
    payload: Partial<UpdateSubImagesPayload>
): UpdateSubImagesAction {
    return {
        payload: {
            channels: payload.channels || [],
            positionIndexes: payload.positionIndexes || [],
            row,
            scenes: payload.scenes || [],
            subImageNames: payload.subImageNames || [],
        },
        type: UPDATE_SUB_IMAGES,
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

export function removeFileFromArchive(fileToNotArchive: string): RemoveFileFromArchiveAction {
    return {
        payload: fileToNotArchive,
        type: REMOVE_FILE_FROM_ARCHIVE,
    };
}

export function removeFileFromIsilon(fileToNotStoreOnIsilon: string): RemoveFileFromIsilonAction {
    return {
        payload: fileToNotStoreOnIsilon,
        type: REMOVE_FILE_FROM_ISILON,
    };
}

export function clearUpload(): ClearUploadAction {
    return {
        type: CLEAR_UPLOAD,
    };
}
