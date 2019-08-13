import {
    ASSOCIATE_FILES_AND_WELLS,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOAD,
    INITIATE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    UNDO_FILE_WELL_ASSOCIATION,
    UPDATE_SCHEMA,
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
    UpdateSchemaAction,
    UpdateUploadAction,
    UploadMetadata
} from "./types";
import {SchemaDefinition} from "../setting/types";

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

export function updateSchema(schema?: SchemaDefinition, schemaFile?: string): UpdateSchemaAction {
    return {
        payload: {
            schema,
            schemaFile,
            uploads: {}
        },
        type: UPDATE_SCHEMA,
    };
}

export function updateUpload(filePath: string, upload: Partial<UploadMetadata>): UpdateUploadAction {
    return {
        payload: {
            filePath,
            upload
        },
        type: UPDATE_UPLOAD,
    };
}
