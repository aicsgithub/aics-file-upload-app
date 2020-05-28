import { WORKFLOW_ANNOTATION_NAME } from "../../constants";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { Channel, CurrentUpload } from "../metadata/types";
import { Workflow } from "../selection/types";
import { AutoSaveAction, State, WriteToStoreAction } from "../types";

export interface UploadStateBranch {
  [fullPath: string]: UploadMetadata;
}

// Think of this group as a composite key. No two rows should have the same combination of these values.
export interface UploadRowId {
  channelId?: number;
  file: string; // fullpath
  positionIndex?: number;
  scene?: number;
  subImageName?: string;
}

// Metadata associated with a file
export interface UploadMetadata extends UploadRowId {
  barcode: string;
  notes?: string[]; // only one note expected but we treat this like other custom annotations
  shouldBeInArchive?: boolean;
  shouldBeInLocal?: boolean;
  templateId?: number;
  wellIds: number[];
  [WORKFLOW_ANNOTATION_NAME]?: string[];
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
  scene?: number;
  subImageName?: string;
  timePointId?: number;
  values: string[];
}

export interface ApplyTemplateAction extends WriteToStoreAction {
  payload: number;
  type: string;
}

export interface UpdateUploadAction extends AutoSaveAction {
  payload: {
    key: string;
    upload: Partial<UploadMetadata>;
  };
  type: string;
}

export interface UpdateUploadRowsAction extends AutoSaveAction {
  payload: {
    uploadKeys: string[];
    metadataUpdate: Partial<UploadMetadata>;
  };
  type: string;
}

export interface UploadJobTableRow extends UploadRowId {
  // custom annotations
  [key: string]: any;

  // plate barcode associated with well and file
  barcode: string;

  // if this row keeps track of information for a channel, the channel should be present here
  channel?: Channel;

  // Keeps track of all channelIds - used only on the top-level row
  channelIds: number[];

  // react-data-grid property needed for nested rows. if true, row will show carat for expanding/collapsing row
  group: boolean;

  // a makeshift hash of filepath, scene, and channel - used by ant.d Table to identify rows
  key: string;

  // notes associated with the file
  notes?: string;

  // react-data-grid property needed for nested rows. identifies how many rows exist at this level of the tree.
  numberSiblings: number;

  // Keeps track of all positionIndexes - used only on the top-level row
  positionIndexes: number[];

  // Keeps track of all scenes - used only on top-level row
  scenes: number[];

  // react-data-grid property needed for nested rows
  siblingIndex?: number;

  // Keeps track of all sub image names - used only on top-level row
  subImageNames: string[];

  // react-data-grid property needed for nested rows
  treeDepth?: number;

  // all wellIds associated with this file model
  wellIds?: number[];

  // human readable identifier of well, such as "A1"
  wellLabels: string[];

  // all workflows associated with this file model
  [WORKFLOW_ANNOTATION_NAME]: string[];
}

export interface AssociateFilesAndWellsAction extends AutoSaveAction {
  payload: {
    barcode: string;
    rowIds: UploadRowId[];
    wellIds: number[];
  };
  type: string;
}

export interface AssociateFilesAndWorkflowsAction extends AutoSaveAction {
  payload: {
    fullPaths: string[];
    workflows: Workflow[];
  };
  type: string;
}

export interface UndoFileWellAssociationAction extends AutoSaveAction {
  payload: {
    deleteUpload: boolean; // whether or not to delete this part of upload if no well associations left
    rowId: UploadRowId;
    wellIds: number[];
  };
  type: string;
}

export interface UndoFileWorkflowAssociationAction extends AutoSaveAction {
  payload: {
    fullPath: string;
    workflowNames: string[];
  };
  type: string;
}

export interface JumpToPastUploadAction extends AutoSaveAction {
  index: number;
  type: string;
}

export interface JumpToUploadAction extends AutoSaveAction {
  index: number;
  type: string;
}

export interface ClearUploadHistoryAction extends AutoSaveAction {
  type: string;
}

export interface RemoveUploadsAction extends AutoSaveAction {
  payload: string[]; // fullpaths to remove from upload state branch
  type: string;
}

export interface InitiateUploadAction extends AutoSaveAction {
  payload: {
    jobName?: string;
  };
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

export interface RetryUploadSucceededAction {
  payload: UploadSummaryTableRow;
  type: string;
}

export interface RetryUploadFailedAction {
  payload: {
    error: string;
    row: UploadSummaryTableRow;
  };
  type: string;
}

export interface CancelUploadSucceededAction {
  payload: UploadSummaryTableRow;
  type: string;
}

export interface CancelUploadFailedAction {
  payload: {
    error: string;
    row: UploadSummaryTableRow;
  };
  type: string;
}
export interface UpdateUploadsAction extends AutoSaveAction {
  payload: Partial<UploadMetadata>;
  type: string;
}

export interface UpdateSubImagesPayload {
  channels: Channel[];
  positionIndexes: number[];
  row: UploadJobTableRow;
  scenes: number[];
  subImageNames: string[];
}

export interface UpdateSubImagesAction extends AutoSaveAction {
  payload: UpdateSubImagesPayload;
  type: string;
}

export interface FilepathToBoolean {
  [filepath: string]: boolean;
}

export interface UpdateFilesToArchive extends AutoSaveAction {
  payload: FilepathToBoolean;
  type: string;
}

export interface UpdateFilesToStoreOnIsilon extends AutoSaveAction {
  payload: FilepathToBoolean;
  type: string;
}

export interface RemoveFileFromArchiveAction extends AutoSaveAction {
  payload: string;
  type: string;
}

export interface RemoveFileFromIsilonAction extends AutoSaveAction {
  payload: string;
  type: string;
}

export interface ClearUploadAction extends AutoSaveAction {
  type: string;
}

export interface SaveUploadDraftAction {
  payload?: string;
  type: string;
}

export interface OpenUploadDraftAction {
  payload: string;
  type: string;
}

export interface ReplaceUploadAction {
  payload: {
    state: State;
    metadata: CurrentUpload;
  };
  type: string;
}

export interface ClearUploadDraftAction extends WriteToStoreAction {
  type: string;
}

export enum FileTagType {
  WELL = "well",
  WORKFLOW = "workflow",
  STORAGE = "storage",
}

// Represents information needed to display an Antd Tag next to a file on the FolderTree.
// There will be a tag for each piece of metadata associated with a file.
export interface FileTag {
  // Whether or not this tag can be closed
  closable: boolean;

  // Tag background color
  color: string;

  // Tag text
  title: string;

  // Type of tag
  type: FileTagType;

  // Well Id that this tag represents, if applicable
  wellId?: number;

  // Workflow name that this tag represents, if applicable
  workflow?: string;
}

export enum FileType {
  CSV = "csv",
  IMAGE = "image",
  OTHER = "other",
  TEXT = "text",
  ZEISS_CONFIG_FILE = "zeiss-config-file",
}
