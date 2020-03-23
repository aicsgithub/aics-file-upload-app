import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { CurrentUpload } from "../metadata/types";

import { Workflow } from "../selection/types";
import { State } from "../types";

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
    OPEN_UPLOAD_DRAFT,
    REMOVE_FILE_FROM_ARCHIVE,
    REMOVE_FILE_FROM_ISILON,
    REPLACE_UPLOAD,
    RETRY_UPLOAD,
    SAVE_UPLOAD_DRAFT,
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
    OpenUploadDraftAction,
    RemoveFileFromArchiveAction,
    RemoveFileFromIsilonAction,
    RemoveUploadsAction, ReplaceUploadAction,
    RetryUploadAction, SaveUploadDraftAction,
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
        autoSave: true,
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
        autoSave: true,
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
        autoSave: true,
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
        autoSave: true,
        payload: {
            fullPath,
            workflows,
        },
        type: UNDO_FILE_WORKFLOW_ASSOCIATION,
    };
}

export function jumpToPastUpload(index: number): JumpToPastUploadAction {
    return {
        autoSave: true,
        index,
        type: JUMP_TO_PAST_UPLOAD,
    };
}

export function jumpToUpload(index: number): JumpToUploadAction {
    return {
        autoSave: true,
        index,
        type: JUMP_TO_UPLOAD,
    };
}

export function clearUploadHistory(): ClearUploadHistoryAction {
    return {
        autoSave: true,
        type: CLEAR_UPLOAD_HISTORY,
    };
}

export function removeUploads(fullPaths: string[]): RemoveUploadsAction {
    return {
        autoSave: true,
        payload: fullPaths,
        type: DELETE_UPLOADS,
    };
}

export function initiateUpload(): InitiateUploadAction {
    return {
        autoSave: true,
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
        autoSave: true,
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
        autoSave: true,
        payload: upload,
        type: UPDATE_UPLOADS,
    };
}

export function updateSubImages(
    row: UploadJobTableRow,
    payload: Partial<UpdateSubImagesPayload>
): UpdateSubImagesAction {
    return {
        autoSave: true,
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
        autoSave: true,
        payload: filesToArchive,
        type: UPDATE_FILES_TO_ARCHIVE,
    };
}

export function updateFilesToStoreOnIsilon(filesToStoreOnIsilon: FilepathToBoolean):
    UpdateFilesToStoreOnIsilon {
    return {
        autoSave: true,
        payload: filesToStoreOnIsilon,
        type: UPDATE_FILES_TO_STORE_ON_ISILON,
    };
}

export function removeFileFromArchive(fileToNotArchive: string): RemoveFileFromArchiveAction {
    return {
        autoSave: true,
        payload: fileToNotArchive,
        type: REMOVE_FILE_FROM_ARCHIVE,
    };
}

export function removeFileFromIsilon(fileToNotStoreOnIsilon: string): RemoveFileFromIsilonAction {
    return {
        autoSave: true,
        payload: fileToNotStoreOnIsilon,
        type: REMOVE_FILE_FROM_ISILON,
    };
}

export function clearUpload(): ClearUploadAction {
    return {
        autoSave: true,
        type: CLEAR_UPLOAD,
    };
}

export function saveUploadDraft(draftName: string): SaveUploadDraftAction {
    return {
        payload: draftName,
        type: SAVE_UPLOAD_DRAFT,
    };
}

export function openUploadDraft(draftName: string): OpenUploadDraftAction {
    return {
        payload: draftName,
        type: OPEN_UPLOAD_DRAFT,
    };
}

export function replaceUpload(upload: { metadata: CurrentUpload, state: State }): ReplaceUploadAction {
    return {
        payload: upload,
        type: REPLACE_UPLOAD,
    };
}
