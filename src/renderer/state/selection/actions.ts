import { GridCell } from "../../containers/AssociateWells/grid-cell";

import { BarcodePrefix } from "../metadata/types";
import {
    ADD_STAGE_FILES,
    CLEAR_SELECTION_HISTORY,
    DESELECT_FILES,
    GET_FILES_IN_FOLDER,
    GO_BACK,
    GO_FORWARD,
    JUMP_TO_PAST_SELECTION,
    LOAD_FILES,
    OPEN_FILES,
    SELECT_BARCODE,
    SELECT_BARCODE_PREFIX,
    SELECT_FILE,
    SELECT_PAGE,
    SET_PLATE,
    SET_WELL,
    SET_WELLS,
    UPDATE_STAGED_FILES,
} from "./constants";
import {
    AddStageFilesAction,
    ClearSelectionHistoryAction,
    DeselectFilesAction,
    DragAndDropFileList,
    GetFilesInFolderAction,
    GoBackAction,
    JumpToPastSelectionAction,
    LoadFilesFromDragAndDropAction,
    LoadFilesFromOpenDialogAction,
    NextPageAction,
    Page,
    PlateResponse,
    SelectBarcodeAction,
    SelectBarcodePrefixAction,
    SelectFileAction,
    SelectPageAction,
    SetPlateAction,
    SetWellAction,
    SetWellsAction,
    UpdateStagedFilesAction,
    UploadFile,
    WellResponse,
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

export function loadFilesFromDragAndDrop(files: DragAndDropFileList): LoadFilesFromDragAndDropAction {
    return {
        payload: files,
        type: LOAD_FILES,
    };
}

export function openFilesFromDialog(files: string[]): LoadFilesFromOpenDialogAction {
    return {
        payload: files,
        type: OPEN_FILES,
    };
}

export function stageFiles(files: UploadFile[]): AddStageFilesAction {
    return {
        payload: files,
        type: ADD_STAGE_FILES,
    };
}

export function selectPage(currentPage: Page, nextPage: Page): SelectPageAction {
    return {
        payload: { currentPage, nextPage },
        type: SELECT_PAGE,
    };
}

export function updateStagedFiles(files: UploadFile[]): UpdateStagedFilesAction {
    return {
        payload: files,
        type: UPDATE_STAGED_FILES,
    };
}

export function getFilesInFolder(folder: UploadFile): GetFilesInFolderAction {
    return {
        payload: folder,
        type: GET_FILES_IN_FOLDER,
    };
}

export function selectBarcode(
    barcode: string,
    imagingSessionIds: number[] = [],
    imagingSessionId?: number
): SelectBarcodeAction {
    return {
        payload: { barcode, imagingSessionId, imagingSessionIds },
        type: SELECT_BARCODE,
    };
}

export function selectBarcodePrefix(barcodePrefix: BarcodePrefix): SelectBarcodePrefixAction {
    return {
        payload: barcodePrefix,
        type: SELECT_BARCODE_PREFIX,
    };
}

export function setPlate(plate: PlateResponse): SetPlateAction {
    return {
        payload: plate,
        type: SET_PLATE,
    };
}

export function setWells(wells: WellResponse[]): SetWellsAction {
    return {
        payload: wells,
        type: SET_WELLS,
    };
}

export function setWell(well: GridCell): SetWellAction {
    return {
        payload: well,
        type: SET_WELL,
    };
}

export function goBack(): GoBackAction {
    return {
        type: GO_BACK,
    };
}

export function goForward(): NextPageAction {
    return {
        type: GO_FORWARD,
    };
}

export function jumpToPastSelection(index: number): JumpToPastSelectionAction {
    return {
        index,
        type: JUMP_TO_PAST_SELECTION,
    };
}

export function clearSelectionHistory(): ClearSelectionHistoryAction {
    return {
        type: CLEAR_SELECTION_HISTORY,
    };
}
