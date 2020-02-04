import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { Channel } from "../metadata/types";
import { Workflow } from "../selection/types";

export interface UploadStateBranch {
    [fullPath: string]: UploadMetadata;
}

// Metadata associated with a file
export interface UploadMetadata {
    barcode: string;
    channel?: Channel;
    file: string;
    notes?: string;
    positionIndex?: number;
    shouldBeInArchive?: boolean;
    shouldBeInLocal?: boolean;
    templateId?: number;
    wellIds: number[];
    workflows?: string[];
    [genericKey: string]: any;
}

export interface DisplayUploadStateBranch {
    [fullPath: string]: UploadMetadataWithDisplayFields;
}

export interface UploadMetadataWithDisplayFields extends UploadMetadata {
    wellLabels: string[];
}

export interface MMSAnnotationValueRequest {
    annotationId: number;
    channelId?: number;
    positionIndex?: number;
    timePointId?: number;
    values: string[];
}

export interface ApplyTemplateAction {
    payload: {
        templateId?: number;
        uploads: UploadStateBranch;
    };
    type: string;
}

export interface UpdateUploadAction {
    payload: {
        key: string;
        upload: Partial<UploadMetadata>;
    };
    type: string;
}

export interface UploadJobTableRow {
    // plate barcode associated with well and file
    barcode: string;

    // if this row keeps track of information for a channel, the channel should be present here
    channel?: Channel;

    // Keeps track of all channelIds - used only on the top-level row
    channelIds: number[];

    // fullpath of file
    file: string;

    // react-data-grid property needed for nested rows. if true, row will show carat for expanding/collapsing row
    group: boolean;

    // a makeshift hash of filepath, scene, and channel - used by ant.d Table to identify rows
    key: string;

    // notes associated with the file
    notes?: string;

    // react-data-grid property needed for nested rows. identifies how many rows exist at this level of the tree.
    numberSiblings: number;

    // if this row relates to a positionIndex, it is specified here
    positionIndex?: number;

    // Keeps track of all positionIndexes - used only on the top-level row
    positionIndexes: number[];

    // react-data-grid property needed for nested rows
    siblingIndex?: number;

    // react-data-grid property needed for nested rows
    treeDepth?: number;

    // all wellIds associated with this file model
    wellIds?: number[];

    // human readable identifier of well, such as "A1"
    wellLabels?: string;

    // all workflows associated with this file model
    workflows?: string;
}

export interface AssociateFilesAndWellsAction {
    payload: {
        barcode: string;
        rowIds: UploadRowId[];
        wellIds: number[];
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
        deleteUpload: boolean; // whether or not to delete this part of upload if no well associations left
        fullPath: string;
        positionIndex?: number;
        wellIds: number[];
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

export interface CancelUploadAction {
    payload: UploadSummaryTableRow;
    type: string;
}

export interface RetryUploadAction {
    payload: UploadSummaryTableRow;
    type: string;
}

export interface UpdateUploadsAction {
    payload: Partial<UploadMetadata>;
    type: string;
}

export interface UpdateScenesAction {
    payload: {
        channels: Channel[];
        positionIndexes: number[];
        row: UploadJobTableRow;
    };
    type: string;
}

export interface FilepathToBoolean {
    [filepath: string]: boolean;
}

export interface UpdateFilesToArchive {
    payload: FilepathToBoolean;
    type: string;
}

export interface UpdateFilesToStoreOnIsilon {
    payload: FilepathToBoolean;
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

export interface UploadRowId {
    file: string; // fullpath
    positionIndex?: number;
    channelId?: number;
}
