import { GridCell } from "../../components/AssociateWells/grid-cell";
import { Workflow } from "../../services/labkey-client/types";
import { CellPopulation, Solution } from "../../services/mms-client/types";
import {
  AutoSaveAction,
  DragAndDropFileList,
  ImagingSessionIdToPlateMap,
  ImagingSessionIdToWellsMap,
  MetadataStateBranch,
  UploadFile,
} from "../types";

export interface DeselectFilesAction {
  type: string;
}

export interface SelectFileAction {
  payload: string | string[];
  type: string;
}

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

export interface AddStageFilesAction extends AutoSaveAction {
  payload: UploadFile[];
  type: string;
}

export interface UpdateStagedFilesAction extends AutoSaveAction {
  payload: UploadFile[];
  type: string;
}

export interface GetFilesInFolderAction extends AutoSaveAction {
  payload: UploadFile;
  type: string;
}

export interface SelectBarcodeAction extends AutoSaveAction {
  payload: {
    barcode: string;
    imagingSessionIds: Array<number | null>;
  };
  type: string;
}

export interface SelectWorkflowPathAction extends AutoSaveAction {
  type: string;
}

export interface SelectWorkflowsAction {
  payload: Workflow[];
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

export interface ClearStagedFilesAction extends AutoSaveAction {
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
