import { OPEN_TEMPLATE_EDITOR } from "../../../shared/constants";
import { GridCell } from "../../components/AssociateWells/grid-cell";
import { OpenTemplateEditorAction } from "../feedback/types";

import {
  ADD_STAGE_FILES,
  CLEAR_SELECTION_HISTORY,
  CLEAR_STAGED_FILES,
  DESELECT_FILES,
  GET_FILES_IN_FOLDER,
  JUMP_TO_PAST_SELECTION,
  LOAD_FILES,
  OPEN_FILES,
  SELECT_ANNOTATION,
  SELECT_BARCODE,
  SELECT_FILE,
  SELECT_IMAGING_SESSION_ID,
  SELECT_USER,
  SELECT_WELLS,
  SELECT_WORKFLOW_PATH,
  SELECT_WORKFLOWS,
  SET_PLATE,
  TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
  UPDATE_STAGED_FILES,
} from "./constants";
import {
  AddStageFilesAction,
  ClearSelectionHistoryAction,
  ClearStagedFilesAction,
  DeselectFilesAction,
  DragAndDropFileList,
  GetFilesInFolderAction,
  ImagingSessionIdToPlateMap,
  ImagingSessionIdToWellsMap,
  JumpToPastSelectionAction,
  LoadFilesFromDragAndDropAction,
  LoadFilesFromOpenDialogAction,
  SelectAnnotationAction,
  SelectBarcodeAction,
  SelectFileAction,
  SelectImagingSessionIdAction,
  SelectUserAction,
  SelectWellsAction,
  SelectWorkflowPathAction,
  SelectWorkflowsAction,
  SetPlateAction,
  ToggleExpandedUploadJobRowAction,
  UpdateStagedFilesAction,
  UploadFile,
  Workflow,
} from "./types";

export function selectFile(fileId: string | string[]): SelectFileAction {
  return {
    payload: fileId,
    type: SELECT_FILE,
  };
}

export function deselectFiles(): DeselectFilesAction {
  return {
    type: DESELECT_FILES,
  };
}

export function loadFilesFromDragAndDrop(
  files: DragAndDropFileList
): LoadFilesFromDragAndDropAction {
  return {
    autoSave: true,
    payload: files,
    type: LOAD_FILES,
  };
}

export function openFilesFromDialog(
  files: string[]
): LoadFilesFromOpenDialogAction {
  return {
    autoSave: true,
    payload: files,
    type: OPEN_FILES,
  };
}

export function stageFiles(files: UploadFile[]): AddStageFilesAction {
  return {
    autoSave: true,
    payload: files,
    type: ADD_STAGE_FILES,
  };
}

export function clearStagedFiles(): ClearStagedFilesAction {
  return {
    autoSave: true,
    type: CLEAR_STAGED_FILES,
  };
}

export function updateStagedFiles(
  files: UploadFile[]
): UpdateStagedFilesAction {
  return {
    autoSave: true,
    payload: files,
    type: UPDATE_STAGED_FILES,
  };
}

export function getFilesInFolder(folder: UploadFile): GetFilesInFolderAction {
  return {
    autoSave: true,
    payload: folder,
    type: GET_FILES_IN_FOLDER,
  };
}

export function selectBarcode(
  barcode: string,
  imagingSessionIds: Array<number | null> = [null]
): SelectBarcodeAction {
  return {
    autoSave: true,
    payload: { barcode, imagingSessionIds },
    type: SELECT_BARCODE,
  };
}

export function selectWorkflowPath(): SelectWorkflowPathAction {
  return {
    autoSave: true,
    type: SELECT_WORKFLOW_PATH,
  };
}

export function selectWorkflows(workflows: Workflow[]): SelectWorkflowsAction {
  return {
    payload: workflows,
    type: SELECT_WORKFLOWS,
  };
}

export function setPlate(
  plate: ImagingSessionIdToPlateMap,
  wells: ImagingSessionIdToWellsMap,
  imagingSessionIds: Array<number | null> = [null]
): SetPlateAction {
  return {
    autoSave: true,
    payload: {
      imagingSessionIds,
      plate,
      wells,
    },
    type: SET_PLATE,
  };
}

export function selectWells(wells: GridCell[]): SelectWellsAction {
  return {
    payload: wells,
    type: SELECT_WELLS,
  };
}

export function openTemplateEditor(
  templateId?: number
): OpenTemplateEditorAction {
  return {
    payload: templateId,
    type: OPEN_TEMPLATE_EDITOR,
  };
}

export function selectAnnotation(annotation: string): SelectAnnotationAction {
  return {
    payload: annotation,
    type: SELECT_ANNOTATION,
  };
}

export function selectUser(user: string): SelectUserAction {
  return {
    payload: user,
    type: SELECT_USER,
  };
}

export function jumpToPastSelection(index: number): JumpToPastSelectionAction {
  return {
    autoSave: true,
    index,
    type: JUMP_TO_PAST_SELECTION,
  };
}

export function clearSelectionHistory(): ClearSelectionHistoryAction {
  return {
    autoSave: true,
    type: CLEAR_SELECTION_HISTORY,
  };
}

export function toggleExpandedUploadJobRow(
  rowKey: string
): ToggleExpandedUploadJobRowAction {
  return {
    payload: rowKey,
    type: TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
  };
}

export function selectImagingSessionId(
  imagingSessionId: number
): SelectImagingSessionIdAction {
  return {
    autoSave: true,
    payload: imagingSessionId,
    type: SELECT_IMAGING_SESSION_ID,
  };
}
