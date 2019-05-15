import { GridCell } from "../../containers/AssociateWells/grid-cell";
import { MetadataStateBranch } from "../metadata/types";
import { Audited } from "../types";

export interface UploadFile {
    name: string;
    path: string;
    files: UploadFile[];
    fullPath: string;
    isDirectory: boolean;
    loadFiles(): Promise<Array<Promise<UploadFile>>>;
}

export interface DeselectFilesAction {
    type: string;
}

export interface SelectionStateBranch {
    barcode?: string;
    files: string[];
    plate?: PlateResponse;
    wells: WellResponse[];
    well?: GridCell;
    page: Page;
    stagedFiles: UploadFile[];
    viabilityResults: GetViabilityResultResponse[];
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
    volumeUnitId: number;
    volumeUnitDisplay?: string;
}

export interface ViabilityResult {
    suspensionVolume: string;
    suspensionVolumeUnitId: number;
    suspensionVolumeUnitDisplay?: string;
    viability: number;
    viableCellCountPerUnit: number;
    viableCellCountUnitId: number;
    viableCellCountUnitDisplay?: string;
    wellViabilityResultId: number;
}

export interface GetViabilityResultResponse extends ViabilityResult {
    col: number;
    row: number;
    wellId: number;
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
    viabilityResults: ViabilityResult[];
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
    payload: string;
    type: string;
}

export interface SetPlateAction {
    payload: PlateResponse;
    type: string;
}

export interface SetViabilityResults {
    payload: GetViabilityResultResponse[];
    type: string;
}

export interface SetWellsAction {
    payload: WellResponse[];
    type: string;
}

export interface SetWellAction {
    payload: GridCell;
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

export enum Page {
    DragAndDrop = "DragAndDrop",
    EnterBarcode = "EnterBarcode",
    AssociateWells = "AssociateWells",
    UploadJobs = "UploadJobs",
    UploadSummary = "UploadSummary",
}

export interface AppPageConfig {
    container: JSX.Element;
    folderTreeVisible: boolean;
    folderTreeSelectable: boolean;
}

export interface GoBackAction {
    type: string;
}

export interface NextPageAction {
    type: string;
}

export interface JumpToPastSelectionAction {
    index: number;
    type: string;
}

export interface ClearSelectionHistoryAction {
    type: string;
}
