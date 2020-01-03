import { GridCell } from "../../components/AssociateWells/grid-cell";
import { MetadataStateBranch } from "../metadata/types";
import { Page } from "../route/types";
import { Audited } from "../types";

export interface UploadFile {
    name: string;
    path: string;
    files: UploadFile[];
    fullPath: string;
    canRead: boolean;
    isDirectory: boolean;
    loadFiles(): Promise<Array<Promise<UploadFile>>>;
}

export interface DeselectFilesAction {
    type: string;
}

export interface SelectionStateBranch {
    annotation: string;
    barcode?: string;
    expandedUploadJobRows: ExpandedRows;
    files: string[];
    folderTreeOpen: boolean;
    imagingSessionId?: number;
    imagingSessionIds: Array<number | null>;
    openTemplateModalVisible: boolean;
    plate?: PlateResponse;
    wells: WellResponse[];
    selectedWells: GridCell[];
    selectedWorkflows: Workflow[];
    settingsEditorVisible: boolean;
    stagedFiles: UploadFile[];
    templateEditorVisible: boolean;
    user: string;
}

export interface ExpandedRows {
    [rowKey: string]: boolean;
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

export interface PopulationEdit {
    cas9BatchId: number;
    cas9BatchName: string;
    crRnaBatchId: number;
    crRnaBatchName: string;
    donorPlasmidBatchId: number;
    donorPlasmidBatchName: string;
}
export interface CellPopulationInfo {
    cellLineId?: number;
    cellLineName?: string;
    cellPopulationId?: number;
    clone?: string;
    edits?: PopulationEdit[];
    passage?: number;
    plateBarcode?: string;
    plateId?: number;
    seedingDensity?: string;
    stageId?: number;
    stageName?: string;
    wellId?: number;
    wellLabel?: string;
}

export interface SolutionLot {
    concentration: number;
    concentrationUnitsId: number;
    concentrationUnitsDisplay?: string;
    dilutionFactorPart: number;
    dilutionFactorTotal: number;
    solutionName: string;
}

export interface CellPopulation {
    seedingDensity: string;
    sourceCellPopulation?: CellPopulationInfo;
    sourcePlateWell?: CellPopulationInfo;
    sourceVial?: {
        barcode: string;
    };
    wellCellPopulation?: CellPopulationInfo;
}

export interface Solution {
    solutionLot: SolutionLot;
    volume: string;
    volumeUnitsId: number;
    volumeUnitDisplay?: string;
}

export interface GetPlateResponse {
    plate: PlateResponse;
    wells: WellResponse[];
}

export interface PlateResponse extends Audited {
    barcode: string;
    comments: string;
    imagingSessionId?: number;
    plateGeometryId: number;
    plateId: number;
    plateStatusId: number;
    seededOn?: string; // Date string
}

export interface WellResponse {
    row: number;
    col: number;
    wellId: number;
    cellPopulations: CellPopulation[];
    solutions: Solution[];
}

export interface Well {
    row: number;
    col: number;
    wellId: number;
    cellPopulations: CellPopulation[];
    modified?: boolean;
    solutions: Solution[];
}

export interface Workflow {
    workflowId: number;
    name: string;
    description: string;
}

export interface LoadFilesFromDragAndDropAction {
    payload: DragAndDropFileList;
    type: string;
}

export interface LoadFilesFromOpenDialogAction {
    payload: string[];
    type: string;
}

export interface AddStageFilesAction {
    payload: UploadFile[];
    type: string;
}

export interface SelectPageAction {
    payload: {
        currentPage: Page;
        nextPage: Page;
    };
    type: string;
}

export interface UpdateStagedFilesAction {
    payload: UploadFile[];
    type: string;
}

export interface GetFilesInFolderAction {
    payload: UploadFile;
    type: string;
}

export interface SelectBarcodeAction {
    payload: {
        barcode: string;
        imagingSessionId?: number;
        imagingSessionIds: number[];
    };
    type: string;
}

export interface SelectWorkflowPathAction {
    type: string;
}

export interface SelectWorkflowsAction {
    payload: Workflow[];
    type: string;
}

export interface SetPlateAction {
    payload: PlateResponse;
    type: string;
}

export interface SetWellsAction {
    payload: WellResponse[];
    type: string;
}

export interface SelectWellsAction {
    payload: GridCell[];
    type: string;
}

export interface SelectAnnotationAction {
    payload: string;
    type: string;
}

export interface SelectUserAction {
    payload: string;
    type: string;
}

export interface CloseTemplateEditorAction {
    type: string;
}

export interface OpenTemplateEditorAction {
    payload?: number;
    type: string;
}

export interface OpenOpenTemplateModalAction {
    type: string;
}

export interface CloseOpenTemplateModalAction {
    type: string;
}

export interface OpenSettingsEditorAction {
    type: string;
}

export interface CloseSettingsEditorAction {
    type: string;
}

export interface DragAndDropFileList {
    readonly length: number;
    [index: number]: DragAndDropFile;
}

export interface DragAndDropFile {
    readonly name: string;
    readonly path: string;
}

export interface JumpToPastSelectionAction {
    index: number;
    type: string;
}

export interface ClearSelectionHistoryAction {
    type: string;
}

export interface ClearStagedFilesAction {
    type: string;
}

export interface ToggleExpandedUploadJobRowAction {
    payload: string;
    type: string;
}

export interface ToggleFolderTreeAction {
    type: string;
}
