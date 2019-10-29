import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { LabkeyTemplate } from "../../util/labkey-client/types";

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
    templateId?: number;
    wellIds: number[];
    wellLabels: string[];
    workflows?: string[];
    [genericKey: string]: any;
}

export interface MMSAnnotationValueRequest {
    annotationId: number;
    channelId?: number;
    positionIndex?: number;
    timePointId?: number;
    values: any[];
}

export interface ApplyTemplateAction {
    payload: {
        template: LabkeyTemplate;
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

    channel?: Channel;

    channelIds: number[];

    // fullpath of file
    file: string;

    // react-data-grid property needed for nested rows. if true, row will show expander
    group: boolean;

    // composed of the fullpath + scene + channel of file - used by ant.d Table to identify rows
    key: string;

    // notes associated with the file
    notes?: string;

    // react-data-grid property needed for nested rows
    numberSiblings: number;

    positionIndex?: number;

    positionIndexes: number[];

    // react-data-grid property needed for nested rows
    siblingIndex?: number;

    // react-data-grid property needed for nested rows
    treeDepth?: number;

    // todo replace wellIds and wellLabels with wells and use selectors
    wellIds?: number[];

    // human readable identifier of well, such as "A1"
    wellLabels?: string;

    workflows?: string;
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
