import {
    CLOSE_OPEN_TEMPLATE_MODAL,
    CLOSE_SETTINGS_EDITOR,
    CLOSE_TEMPLATE_EDITOR,
    OPEN_OPEN_TEMPLATE_MODAL,
    OPEN_SETTINGS_EDITOR,
    OPEN_TEMPLATE_EDITOR,
} from "../../../shared/constants";
import { GridCell } from "../../components/AssociateWells/grid-cell";
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
    SELECT_USER,
    SELECT_WELLS,
    SELECT_WORKFLOW_PATH,
    SELECT_WORKFLOWS,
    SET_PLATE,
    SET_WELLS,
    TOGGLE_EXPANDED_UPLOAD_JOB_ROW, TOGGLE_FOLDER_TREE,
    UPDATE_STAGED_FILES,
} from "./constants";
import {
    AddStageFilesAction,
    ClearSelectionHistoryAction,
    ClearStagedFilesAction,
    CloseOpenTemplateModalAction,
    CloseSettingsEditorAction,
    CloseTemplateEditorAction,
    DeselectFilesAction,
    DragAndDropFileList,
    GetFilesInFolderAction,
    JumpToPastSelectionAction,
    LoadFilesFromDragAndDropAction,
    LoadFilesFromOpenDialogAction,
    OpenOpenTemplateModalAction,
    OpenSettingsEditorAction,
    OpenTemplateEditorAction,
    PlateResponse,
    SelectAnnotationAction,
    SelectBarcodeAction,
    SelectFileAction,
    SelectUserAction,
    SelectWellsAction,
    SelectWorkflowPathAction,
    SelectWorkflowsAction,
    SetPlateAction,
    SetWellsAction,
    ToggleExpandedUploadJobRowAction, ToggleFolderTreeAction,
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

export function closeTemplateEditor(): CloseTemplateEditorAction {
    return {
        type: CLOSE_TEMPLATE_EDITOR,
    };
}

export function openTemplateEditor(templateId?: number): OpenTemplateEditorAction {
    return {
        payload: templateId,
        type: OPEN_TEMPLATE_EDITOR,
    };
}

export function openOpenTemplateModal(): OpenOpenTemplateModalAction {
    return {
        type: OPEN_OPEN_TEMPLATE_MODAL,
    };
}

export function closeOpenTemplateModal(): CloseOpenTemplateModalAction {
    return {
        type: CLOSE_OPEN_TEMPLATE_MODAL,
    };
}

export function openSettingsEditor(): OpenSettingsEditorAction {
    return {
        type: OPEN_SETTINGS_EDITOR,
    };
}

export function closeSettingsEditor(): CloseSettingsEditorAction {
    return {
        type: CLOSE_SETTINGS_EDITOR,
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
        index,
        type: JUMP_TO_PAST_SELECTION,
    };
}

export function clearSelectionHistory(): ClearSelectionHistoryAction {
    return {
        type: CLEAR_SELECTION_HISTORY,
    };
}

export function toggleExpandedUploadJobRow(rowKey: string): ToggleExpandedUploadJobRowAction {
    return {
        payload: rowKey,
        type: TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
    };
}

export function toggleFolderTree(): ToggleFolderTreeAction {
    return {
        type: TOGGLE_FOLDER_TREE,
    }
}
