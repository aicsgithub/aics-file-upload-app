import {
    ASSOCIATE_FILES_AND_WELL,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOAD,
    INITIATE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    UNDO_FILE_WELL_ASSOCIATION
} from "./constants";
import {
    AssociateFilesAndWellAction,
    ClearUploadHistoryAction,
    InitiateUploadAction,
    JumpToPastUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    UndoFileWellAssociationAction
} from "./types";

export function associateFilesAndWell(fullPaths: string[], wellIds: number[], wellLabels: string[])
    : AssociateFilesAndWellAction {
    return {
        payload: {
            barcode: "",
            fullPaths,
            wellIds,
            wellLabels
        },
        type: ASSOCIATE_FILES_AND_WELL,
    };
}

export function undoFileWellAssociation(fullPath: string, wellIds: number[], wellLabels: string[]): UndoFileWellAssociationAction {
    return {
        payload: {
            fullPath,
            wellIds,
            wellLabels
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
