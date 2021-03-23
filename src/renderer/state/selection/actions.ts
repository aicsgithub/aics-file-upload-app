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
  ADD_ROW_TO_DRAG_EVENT,
  APPLY_MASS_EDIT,
  CANCEL_MASS_EDIT,
  CLEAR_SELECTION_HISTORY,
  CLOSE_SUB_FILE_SELECTION_MODAL,
  JUMP_TO_PAST_SELECTION,
  LOAD_FILES,
  OPEN_FILES,
  OPEN_SUB_FILE_SELECTION_MODAL,
  REMOVE_ROW_FROM_DRAG_EVENT,
  SELECT_BARCODE,
  SELECT_IMAGING_SESSION_ID,
  SELECT_WELLS,
  SET_HAS_NO_PLATE_TO_UPLOAD,
  SET_PLATE,
  START_CELL_DRAG,
  START_MASS_EDIT,
  STOP_CELL_DRAG,
  UPDATE_MASS_EDIT_ROW,
} from "./constants";
import {
  AddRowToDragEventAction,
  ApplyMassEditAction,
  CancelMassEditAction,
  ClearSelectionHistoryAction,
  CloseSubFileSelectionModalAction,
  JumpToPastSelectionAction,
  LoadFilesFromDragAndDropAction,
  LoadFilesFromOpenDialogAction,
  OpenSubFileSelectionModalAction,
  RemoveRowFromDragEventAction,
  SelectBarcodeAction,
  SelectImagingSessionIdAction,
  SelectWellsAction,
  SetHasNoPlateToUploadAction,
  SetPlateAction,
  StartCellDragAction,
  StartMassEditAction,
  StopCellDragAction,
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

export function startMassEdit(selectedRowIds: string[]): StartMassEditAction {
  return {
    payload: selectedRowIds,
    type: START_MASS_EDIT,
  };
}

export function applyMassEdit(): ApplyMassEditAction {
  return {
    type: APPLY_MASS_EDIT,
  };
}

export function cancelMassEdit(): CancelMassEditAction {
  return {
    type: CANCEL_MASS_EDIT,
  };
}

export function closeSubFileSelectionModal(): CloseSubFileSelectionModalAction {
  return {
    type: CLOSE_SUB_FILE_SELECTION_MODAL,
  };
}

export function openSubFileSelectionModal(
  file: string
): OpenSubFileSelectionModalAction {
  return {
    payload: file,
    type: OPEN_SUB_FILE_SELECTION_MODAL,
  };
}

export function addRowToDragEvent(rowId: string): AddRowToDragEventAction {
  return {
    payload: rowId,
    type: ADD_ROW_TO_DRAG_EVENT,
  };
}

export function removeRowFromDragEvent(
  rowId: string
): RemoveRowFromDragEventAction {
  return {
    payload: rowId,
    type: REMOVE_ROW_FROM_DRAG_EVENT,
  };
}

export function startCellDrag(
  yCoordinate: number,
  rowId: string,
  columnId: string
): StartCellDragAction {
  return {
    payload: { yCoordinate, rowId, columnId },
    type: START_CELL_DRAG,
  };
}

export function stopCellDrag(): StopCellDragAction {
  return {
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
