import {
  PREFERRED_TEMPLATE_ID,
  TEMP_UPLOAD_STORAGE_KEY,
} from "../../../shared/constants";
import {
  State,
  UploadMetadata,
  UploadRowId,
  UploadSummaryTableRow,
} from "../types";

import {
  APPLY_TEMPLATE,
  CANCEL_UPLOAD,
  CANCEL_UPLOAD_FAILED,
  CANCEL_UPLOAD_SUCCEEDED,
  CLEAR_UPLOAD_DRAFT,
  CLEAR_UPLOAD_HISTORY,
  DELETE_UPLOADS,
  EDIT_FILE_METADATA_FAILED,
  EDIT_FILE_METADATA_SUCCEEDED,
  INITIATE_UPLOAD,
  INITIATE_UPLOAD_FAILED,
  INITIATE_UPLOAD_SUCCEEDED,
  JUMP_TO_PAST_UPLOAD,
  JUMP_TO_UPLOAD,
  OPEN_UPLOAD_DRAFT,
  REPLACE_UPLOAD,
  RETRY_UPLOAD,
  SAVE_UPLOAD_DRAFT,
  SAVE_UPLOAD_DRAFT_SUCCESS,
  SUBMIT_FILE_METADATA_UPDATE,
  UPDATE_AND_RETRY_UPLOAD,
  UPDATE_SUB_IMAGES,
  UPDATE_UPLOAD,
  UPDATE_UPLOAD_ROWS,
  UPDATE_UPLOADS,
  UPLOAD_FAILED,
  UPLOAD_SUCCEEDED,
  ADD_UPLOAD_FILES,
} from "./constants";
import {
  AddUploadFilesAction,
  ApplyTemplateAction,
  CancelUploadAction,
  CancelUploadFailedAction,
  CancelUploadSucceededAction,
  ClearUploadDraftAction,
  ClearUploadHistoryAction,
  EditFileMetadataFailedAction,
  EditFileMetadataSucceededAction,
  InitiateUploadAction,
  InitiateUploadFailedAction,
  InitiateUploadSucceededAction,
  JumpToPastUploadAction,
  JumpToUploadAction,
  OpenUploadDraftAction,
  RemoveUploadsAction,
  ReplaceUploadAction,
  RetryUploadAction,
  SaveUploadDraftAction,
  SaveUploadDraftSuccessAction,
  SubmitFileMetadataUpdateAction,
  UpdateAndRetryUploadAction,
  UpdateSubImagesAction,
  UpdateSubImagesPayload,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UpdateUploadsAction,
  UploadFailedAction,
  UploadJobTableRow,
  UploadSucceededAction,
} from "./types";

export function addUploadFiles(
  uploadFiles: UploadRowId[]
): AddUploadFilesAction {
  return {
    autoSave: true,
    payload: uploadFiles,
    type: ADD_UPLOAD_FILES,
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
    payload: "Initiating upload",
    writeToStore: true,
    type: INITIATE_UPLOAD,
  };
}

export function initiateUploadSucceeded(
  jobName: string
): InitiateUploadSucceededAction {
  return {
    payload: jobName,
    type: INITIATE_UPLOAD_SUCCEEDED,
  };
}

export function initiateUploadFailed(
  jobName: string,
  error: string
): InitiateUploadFailedAction {
  return {
    payload: {
      error,
      jobName,
    },
    type: INITIATE_UPLOAD_FAILED,
  };
}

export function uploadSucceeded(jobName: string): UploadSucceededAction {
  return {
    payload: jobName,
    type: UPLOAD_SUCCEEDED,
  };
}

export function uploadFailed(
  error: string,
  jobName: string
): UploadFailedAction {
  return {
    payload: {
      error,
      jobName,
    },
    type: UPLOAD_FAILED,
  };
}

export function applyTemplate(templateId: number): ApplyTemplateAction {
  return {
    payload: templateId,
    type: APPLY_TEMPLATE,
    updates: {
      [PREFERRED_TEMPLATE_ID]: templateId,
    },
    writeToStore: true,
  };
}

export function updateUpload(
  key: string,
  upload: Partial<UploadMetadata>
): UpdateUploadAction {
  return {
    autoSave: true,
    payload: {
      key,
      upload,
    },
    type: UPDATE_UPLOAD,
  };
}

export function updateUploadRows(
  uploadKeys: string[],
  metadataUpdate: Partial<UploadMetadata>
): UpdateUploadRowsAction {
  return {
    autoSave: true,
    payload: {
      metadataUpdate,
      uploadKeys,
    },
    type: UPDATE_UPLOAD_ROWS,
  };
}

export function cancelUpload(job: UploadSummaryTableRow): CancelUploadAction {
  return {
    payload: job,
    type: CANCEL_UPLOAD,
  };
}

export function cancelUploadSucceeded(
  jobName: string
): CancelUploadSucceededAction {
  return {
    payload: jobName,
    type: CANCEL_UPLOAD_SUCCEEDED,
  };
}

export function cancelUploadFailed(
  jobName: string,
  error: string
): CancelUploadFailedAction {
  return {
    payload: {
      error,
      jobName,
    },
    type: CANCEL_UPLOAD_FAILED,
  };
}

export function retryUpload(job: UploadSummaryTableRow): RetryUploadAction {
  return {
    payload: job,
    type: RETRY_UPLOAD,
  };
}

export function updateUploads(
  uploads: Partial<UploadMetadata>,
  clearAll = false
): UpdateUploadsAction {
  return {
    autoSave: true,
    payload: {
      clearAll,
      uploads,
    },
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
      channelIds: payload.channelIds || [],
      positionIndexes: payload.positionIndexes || [],
      row,
      scenes: payload.scenes || [],
      subImageNames: payload.subImageNames || [],
    },
    type: UPDATE_SUB_IMAGES,
  };
}

// This will automatically save the draft if metadata.currentUploadFilePath is set
// And if not, it will open a save dialog.
// If saveFilePathToStore is true, after the user saves the data to a file, the filePath
// Will get set on metadata.currentUploadFilePath
export function saveUploadDraft(
  saveFilePathToStore = false
): SaveUploadDraftAction {
  return {
    payload: saveFilePathToStore,
    type: SAVE_UPLOAD_DRAFT,
  };
}

// This opens a native open dialog, allowing users to select a upload draft from their file system
export function openUploadDraft(): OpenUploadDraftAction {
  return {
    type: OPEN_UPLOAD_DRAFT,
  };
}

export function replaceUpload(
  filePath: string,
  replacementState: State
): ReplaceUploadAction {
  return {
    payload: { filePath, replacementState },
    type: REPLACE_UPLOAD,
  };
}

export function clearUploadDraft(): ClearUploadDraftAction {
  return {
    type: CLEAR_UPLOAD_DRAFT,
    updates: {
      [TEMP_UPLOAD_STORAGE_KEY]: undefined,
    },
    writeToStore: true,
  };
}

export function saveUploadDraftSuccess(
  filePath?: string
): SaveUploadDraftSuccessAction {
  return {
    payload: filePath,
    type: SAVE_UPLOAD_DRAFT_SUCCESS,
    updates: {
      [TEMP_UPLOAD_STORAGE_KEY]: undefined,
    },
    writeToStore: true,
  };
}

export function submitFileMetadataUpdate(): SubmitFileMetadataUpdateAction {
  return {
    type: SUBMIT_FILE_METADATA_UPDATE,
  };
}

export function editFileMetadataSucceeded(
  jobName: string
): EditFileMetadataSucceededAction {
  return {
    payload: jobName,
    type: EDIT_FILE_METADATA_SUCCEEDED,
  };
}

export function editFileMetadataFailed(
  message: string,
  jobName: string
): EditFileMetadataFailedAction {
  return {
    payload: {
      error: message,
      jobName,
    },
    type: EDIT_FILE_METADATA_FAILED,
  };
}

export function updateAndRetryUpload(): UpdateAndRetryUploadAction {
  return {
    type: UPDATE_AND_RETRY_UPLOAD,
  };
}
