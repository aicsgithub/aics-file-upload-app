import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { Workflow } from "../selection/types";
import { SchemaDefinition } from "../setting/types";

export interface UploadStateBranch {
    [fullPath: string]: UploadMetadata;
}

// Metadata associated with a file
export interface UploadMetadata {
    barcode: string;
    notes?: string;
    schemaFile?: string;
    wellIds: number[];
    wellLabels: string[];
    workflows: Workflow[];
    [genericKey: string]: any;
}

export interface UpdateSchemaAction {
    payload: {
        schema?: SchemaDefinition;
        schemaFile?: string;
        uploads: UploadStateBranch;
    };
    type: string;
}

export interface UpdateUploadAction {
    payload: {
        filePath: string;
        upload: Partial<UploadMetadata>;
    };
    type: string;
}

export interface UploadJobTableRow {
    // plate barcode associated with well and file
    barcode: string;

    // fullpath of file
    file: string;

    // also fullpath of file - used by ant.d Table to identify rows
    key: string;

    // notes associated with the file
    notes?: string;

    // human readable identifier of well, such as "A1"
    wellLabels: string;
}

export interface SchemaFileOption {
    filepath: string;
}

export interface AssociateFilesAndWellsAction {
    payload: {
        barcode: string,
        fullPaths: string[],
        wellIds: number[],
        wellLabels: string[]
    };
    type: string;
}

export interface AssociateFilesAndWorkflowsAction {
    payload: {
        fullPaths: string[],
        workflows: Workflow[],
    };
    type: string;
}

export interface UndoFileWellAssociationAction {
    payload: {
        fullPath: string,
        wellIds: number[],
        wellLabels: string[]
    };
    type: string;
}

export interface UndoFileWorkflowAssociationAction {
    payload: {
        fullPath: string,
        workflows: Workflow[],
    };
    type: string;
}

export interface JumpToPastUploadAction {
    index: number;
    type: string;
}

export interface JumpToUploadAction {
    index: number;
    type: string;
}

export interface ClearUploadHistoryAction {
    type: string;
}

export interface RemoveUploadsAction {
    payload: string[]; // fullpaths to remove from upload state branch
    type: string;
}

export interface InitiateUploadAction {
    type: string;
}

export interface RetryUploadAction {
    payload: UploadSummaryTableRow;
    type: string;
}

// Represents information needed to display an Antd Tag next to a file on the FolderTree.
// There will be a tag for each piece of metadata associated with a file.
export interface FileTagType {
    // Tag text
    title: string;
    // Tag background color
    color: string;
}

export enum FileType {
    CSV = "csv",
    IMAGE = "image",
    OTHER = "other",
    TEXT = "text",
    ZEISS_CONFIG_FILE = "zeiss-config-file",
}
