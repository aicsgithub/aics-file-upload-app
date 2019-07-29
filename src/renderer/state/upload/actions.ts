import {
    ASSOCIATE_FILES_AND_WELLS,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOAD,
    INITIATE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    UNDO_FILE_WELL_ASSOCIATION,
    UPDATE_UPLOAD
} from "./constants";
import {
    AssociateFilesAndWellsAction,
    ClearUploadHistoryAction,
    InitiateUploadAction,
    JumpToPastUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    UndoFileWellAssociationAction,
    UpdateUploadAction,
    UploadJobTableRow
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
        type: DELETE_UPLOAD,
    };
}

export function initiateUpload(): InitiateUploadAction {
    return {
        type: INITIATE_UPLOAD,
    };
}


export function updateUpload(upload: UploadJobTableRow): UpdateUploadAction {
    return {
        payload: upload,
        type: UPDATE_UPLOAD,
    };
}
