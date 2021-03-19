import { GridCell } from "../../entities";
import { CellPopulation, Solution } from "../../services/mms-client/types";
import {
  AutoSaveAction,
  DragAndDropFileList,
  ImagingSessionIdToPlateMap,
  ImagingSessionIdToWellsMap,
  MassEditRow,
  MetadataStateBranch,
  UploadKeyValue,
} from "../types";

export interface SelectMetadataAction {
  key: keyof MetadataStateBranch;
  payload: string | number;
  type: string;
}

export interface Well {
  row: number;
  col: number;
  wellId: number;
  cellPopulations: CellPopulation[];
  plateId: number;
  modified?: boolean;
  solutions: Solution[];
}

export interface LoadFilesFromDragAndDropAction extends AutoSaveAction {
  payload: DragAndDropFileList;
  type: string;
}

export interface LoadFilesFromOpenDialogAction extends AutoSaveAction {
  payload: string[];
  type: string;
}

export interface CloseSubFileSelectionModalAction {
  type: string;
}

export interface OpenSubFileSelectionModalAction {
  payload: string;
  type: string;
}

export interface SelectBarcodeAction extends AutoSaveAction {
  payload: {
    barcode: string;
    imagingSessionIds: Array<number | null>;
  };
  type: string;
}

export interface SetHasNoPlateToUploadAction {
  payload: boolean;
  type: string;
}

export interface SetPlateAction extends AutoSaveAction {
  payload: {
    imagingSessionIds: Array<number | null>;
    plate: ImagingSessionIdToPlateMap;
    wells: ImagingSessionIdToWellsMap;
  };
  type: string;
}

export interface SelectWellsAction {
  payload: GridCell[];
  type: string;
}

export interface JumpToPastSelectionAction extends AutoSaveAction {
  index: number;
  type: string;
}

export interface ClearSelectionHistoryAction extends AutoSaveAction {
  type: string;
}

export interface ToggleExpandedUploadJobRowAction {
  payload: string;
  type: string;
}

export interface SelectImagingSessionIdAction extends AutoSaveAction {
  payload: number;
  type: string;
}

export interface StartCellDragAction {
  payload: UploadKeyValue;
  type: string;
}

export interface StopCellDragAction {
  type: string;
}

export interface UpdateMassEditRowAction {
  payload: MassEditRow;
  type: string;
}

export interface StartMassEditAction {
  payload: string[];
  type: string;
}

export interface ApplyMassEditAction {
  type: string;
}

export interface CancelMassEditAction {
  type: string;
}
