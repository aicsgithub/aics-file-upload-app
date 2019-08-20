import { Workflow } from "../selection/types";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { SchemaDefinition } from "../setting/types";
import {
    ASSOCIATE_FILES_AND_WELLS,
    ASSOCIATE_FILES_AND_WORKFLOWS,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOAD,
    INITIATE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    RETRY_UPLOAD,
    UNDO_FILE_WELL_ASSOCIATION,
    UNDO_FILE_WORKFLOW_ASSOCIATION,
    UPDATE_SCHEMA,
    UPDATE_UPLOAD,
} from "./constants";
import {
    AssociateFilesAndWellsAction,
    AssociateFilesAndWorkflowsAction,
    ClearUploadHistoryAction,
    InitiateUploadAction,
    JumpToPastUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    RetryUploadAction,
    UndoFileWellAssociationAction,
    UndoFileWorkflowAssociationAction,
    UpdateSchemaAction,
    UpdateUploadAction,
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
            uploads: {},
        },
        type: UPDATE_SCHEMA,
    };
}

export function updateUpload(filePath: string, upload: Partial<UploadMetadata>): UpdateUploadAction {
    return {
        payload: {
            filePath,
            upload,
        },
        type: UPDATE_UPLOAD,
    };
}

export function retryUpload(job: UploadSummaryTableRow): RetryUploadAction {
    return {
        payload: job,
        type: RETRY_UPLOAD,
    };
}
