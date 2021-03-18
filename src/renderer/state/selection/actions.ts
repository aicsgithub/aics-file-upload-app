import { OPEN_TEMPLATE_MENU_ITEM_CLICKED } from "../../../shared/constants";
import { GridCell } from "../../entities";
import { OpenTemplateEditorAction } from "../feedback/types";
import {
  DragAndDropFileList,
  ImagingSessionIdToPlateMap,
  ImagingSessionIdToWellsMap,
  MassEditRow,
} from "../types";

import {
  CLEAR_SELECTION_HISTORY,
  JUMP_TO_PAST_SELECTION,
  LOAD_FILES,
  OPEN_FILES,
  SELECT_BARCODE,
  SELECT_IMAGING_SESSION_ID,
  SELECT_WELLS,
  SET_HAS_NO_PLATE_TO_UPLOAD,
  SET_PLATE,
  START_CELL_DRAG,
  STOP_CELL_DRAG,
  TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
  UPDATE_MASS_EDIT_ROW,
} from "./constants";
import {
  ClearSelectionHistoryAction,
  JumpToPastSelectionAction,
  LoadFilesFromDragAndDropAction,
  LoadFilesFromOpenDialogAction,
  SelectBarcodeAction,
  SelectImagingSessionIdAction,
  SelectWellsAction,
  SetHasNoPlateToUploadAction,
  SetPlateAction,
  StartCellDragAction,
  StopCellDragAction,
  ToggleExpandedUploadJobRowAction,
  UpdateMassEditRowAction,
} from "./types";

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

export function startCellDrag(
  yCoordinate: number,
  columnId: string
): StartCellDragAction {
  return {
    payload: { yCoordinate, columnId },
    type: START_CELL_DRAG,
  };
}

export function stopCellDrag(yCoordinate: number): StopCellDragAction {
  return {
    payload: yCoordinate,
    type: STOP_CELL_DRAG,
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

export function setHasNoPlateToUpload(
  hasNoPlateToUpload: boolean
): SetHasNoPlateToUploadAction {
  return {
    payload: hasNoPlateToUpload,
    type: SET_HAS_NO_PLATE_TO_UPLOAD,
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
