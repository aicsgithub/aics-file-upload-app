import {
  CHANNEL_ANNOTATION_NAME,
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
} from "../../constants";
import { UploadServiceFields } from "../../services/aicsfiles/util";
import { JSSJob } from "../../services/job-status-client/types";
import {
  AutoSaveAction,
  State,
  UploadMetadata,
  UploadRowId,
  WriteToStoreAction,
} from "../types";

export interface DisplayUploadStateBranch {
  [fullPath: string]: UploadMetadataWithDisplayFields;
}

export interface UploadMetadataWithDisplayFields extends UploadMetadata {
  wellLabels: string[];
}

export interface MMSAnnotationValueRequest {
  annotationId: number;
  channelId?: string; // channel name or channel index (not primary key)
  positionIndex?: number;
  scene?: number;
  subImageName?: string;
  values: string[];
}

export interface AddUploadFilesAction extends AutoSaveAction {
  payload: UploadRowId[];
  type: string;
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

  // Keeps track of all channelIds - used only on the top-level row
  [CHANNEL_ANNOTATION_NAME]: string[];

  // react-table property for discovering sub rows for any given row
  subRows: UploadJobTableRow[];

  // notes associated with the file
  [NOTES_ANNOTATION_NAME]?: string;

  // Keeps track of all positionIndexes - used only on the top-level row
  positionIndexes: number[];

  // Keeps track of all scenes - used only on top-level row
  scenes: number[];

  // Keeps track of all sub image names - used only on top-level row
  subImageNames: string[];

  // all wellIds associated with this file model
  [WELL_ANNOTATION_NAME]?: number[];

  // human readable identifier of well, such as "A1"
  wellLabels: string[];
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
  payload: string[];
  type: string;
}

export interface InitiateUploadSucceededAction {
  payload: JSSJob;
  type: string;
}

export interface InitiateUploadFailedAction {
  payload: {
    jobName: string;
    error: string;
  };
  type: string;
}

export interface UploadSucceededAction {
  payload: string;
  type: string;
}

export interface UploadFailedAction {
  payload: {
    jobName: string;
    error: string;
  };
  type: string;
}

export interface CancelUploadAction<
  T extends JSSJob<UploadServiceFields> = JSSJob<UploadServiceFields>
> {
  payload: T;
  type: string;
}

export interface RetryUploadAction<
  T extends JSSJob<UploadServiceFields> = JSSJob<UploadServiceFields>
> {
  payload: T;
  type: string;
}

export interface CancelUploadSucceededAction {
  payload: string;
  type: string;
}

export interface CancelUploadFailedAction {
  payload: {
    error: string;
    jobName: string;
  };
  type: string;
}
export interface UpdateUploadsAction extends AutoSaveAction {
  payload: {
    clearAll: boolean;
    uploads: Partial<UploadMetadata>;
  };
  type: string;
}

export interface UpdateSubImagesPayload {
  channelIds: string[];
  positionIndexes: number[];
  row: UploadJobTableRow;
  scenes: number[];
  subImageNames: string[];
}

export interface UpdateSubImagesAction extends AutoSaveAction {
  payload: UpdateSubImagesPayload;
  type: string;
}

export interface SaveUploadDraftAction {
  // represents whether to set uploadDraftFilePath after success
  payload: boolean;
  type: string;
}

export interface OpenUploadDraftAction {
  type: string;
}

export interface ReplaceUploadAction {
  payload: {
    filePath: string;
    replacementState: State;
  };
  type: string;
}

export interface ClearUploadDraftAction extends WriteToStoreAction {
  type: string;
}

export interface SubmitFileMetadataUpdateAction {
  payload?: string; // jobName
  type: string;
}

export interface EditFileMetadataSucceededAction {
  payload: string; // jobName
  type: string;
}

export interface EditFileMetadataFailedAction {
  payload: {
    error: string;
    jobName: string;
  };
  type: string;
}

export interface SaveUploadDraftSuccessAction extends WriteToStoreAction {
  // this is the file path of the draft that was saved. It is undefined if we do not want to set this value on
  // the store - for example when closing the upload tab we may save the draft but we want this value to be undefined.
  payload?: string;
  type: string;
}

export interface UpdateAndRetryUploadAction {
  payload?: string; // job name
  type: string;
}

export enum FileType {
  CSV = "csv",
  IMAGE = "image",
  OTHER = "other",
  TEXT = "text",
  ZEISS_CONFIG_FILE = "zeiss-config-file",
}
