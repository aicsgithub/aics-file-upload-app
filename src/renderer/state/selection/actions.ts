import { GridCell } from "../../components/AssociateWells/grid-cell";

import { CLOSE_CREATE_SCHEMA_MODAL, OPEN_CREATE_SCHEMA_MODAL } from "../../../shared/constants";
import { Template } from "../template/types";
import {
    ADD_STAGE_FILES,
    CLEAR_SELECTION_HISTORY,
    CLEAR_STAGED_FILES,
    DESELECT_FILES,
    GET_FILES_IN_FOLDER,
    GO_BACK,
    GO_FORWARD,
    JUMP_TO_PAST_SELECTION,
    LOAD_FILES,
    OPEN_FILES,
    SELECT_BARCODE,
    SELECT_FILE,
    SELECT_PAGE, SELECT_TEMPLATE,
    SELECT_VIEW,
    SELECT_WELLS,
    SELECT_WORKFLOW_PATH,
    SELECT_WORKFLOWS,
    SET_PLATE,
    SET_WELLS,
    UPDATE_STAGED_FILES,
} from "./constants";
import {
    AddStageFilesAction,
    ClearSelectionHistoryAction,
    ClearStagedFilesAction,
    CloseTemplateEditorAction,
    DeselectFilesAction,
    DragAndDropFileList,
    GetFilesInFolderAction,
    GoBackAction,
    JumpToPastSelectionAction,
    LoadFilesFromDragAndDropAction,
    LoadFilesFromOpenDialogAction,
    NextPageAction,
    OpenTemplateEditorAction,
    Page,
    PlateResponse,
    SelectBarcodeAction,
    SelectFileAction,
    SelectPageAction, SelectTemplateAction,
    SelectViewAction,
    SelectWellsAction,
    SelectWorkflowPathAction,
    SelectWorkflowsAction,
    SetPlateAction,
    SetWellsAction,
    UpdateStagedFilesAction,
    UploadFile,
    WellResponse,
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

export function clearStagedFiles(): ClearStagedFilesAction {
    return {
        type: CLEAR_STAGED_FILES,
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

export function selectWorkflowPath(): SelectWorkflowPathAction {
    return {
        type: SELECT_WORKFLOW_PATH,
    };
}

export function selectWorkflows(workflows: Workflow[]): SelectWorkflowsAction {
    return {
        payload: workflows,
        type: SELECT_WORKFLOWS,
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

export function selectWells(wells: GridCell[]): SelectWellsAction {
    return {
        payload: wells,
        type: SELECT_WELLS,
    };
}

export function closeSchemaCreator(): CloseTemplateEditorAction {
    return {
        type: CLOSE_CREATE_SCHEMA_MODAL,
    };
}

export function openSchemaCreator(templateId?: number): OpenTemplateEditorAction {
    return {
        payload: templateId,
        type: OPEN_CREATE_SCHEMA_MODAL,
    };
}

export function selectView(view: string): SelectViewAction {
    return {
        payload: view,
        type: SELECT_VIEW,
    };
}

export function selectTemplate(template: Template): SelectTemplateAction {
    return {
        payload: template,
        type: SELECT_TEMPLATE,
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
