import { OPEN_TEMPLATE_MENU_ITEM_CLICKED } from "../../../shared/constants";
import { GridCell } from "../../components/AssociateWells/grid-cell";
import { Workflow } from "../../services/labkey-client/types";
import { OpenTemplateEditorAction } from "../feedback/types";
import {
  DragAndDropFileList,
  ImagingSessionIdToPlateMap,
  ImagingSessionIdToWellsMap,
  MassEditRow,
  UploadFile,
} from "../types";

import {
  CLEAR_SELECTION_HISTORY,
  GET_FILES_IN_FOLDER,
  JUMP_TO_PAST_SELECTION,
  LOAD_FILES,
  OPEN_FILES,
  SELECT_BARCODE,
  SELECT_FILE,
  SELECT_IMAGING_SESSION_ID,
  SELECT_WELLS,
  SELECT_WORKFLOW_PATH,
  SELECT_WORKFLOWS,
  SET_PLATE,
  TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
  UPDATE_MASS_EDIT_ROW,
} from "./constants";
import {
  ClearSelectionHistoryAction,
  GetFilesInFolderAction,
  JumpToPastSelectionAction,
  LoadFilesFromDragAndDropAction,
  LoadFilesFromOpenDialogAction,
  SelectBarcodeAction,
  SelectFileAction,
  SelectImagingSessionIdAction,
  SelectWellsAction,
  SelectWorkflowPathAction,
  SelectWorkflowsAction,
  SetPlateAction,
  ToggleExpandedUploadJobRowAction,
  UpdateMassEditRowAction,
} from "./types";

export function selectFile(fileId: string | string[]): SelectFileAction {
  return {
    payload: fileId,
    type: SELECT_FILE,
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
    type: OPEN_TEMPLATE_MENU_ITEM_CLICKED,
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

export function updateMassEditRow(
  upload: MassEditRow
): UpdateMassEditRowAction {
  return {
    payload: upload,
    type: UPDATE_MASS_EDIT_ROW,
  };
}
