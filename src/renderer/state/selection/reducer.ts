import { castArray } from "lodash";
import { userInfo } from "os";
import { AnyAction } from "redux";
import undoable, {
    UndoableOptions,
} from "redux-undo";
import { RESET_HISTORY } from "../metadata/constants";

import { TypeToDescriptionMap } from "../types";
import { getReduxUndoFilterFn, makeReducer } from "../util";

import {
    CLOSE_OPEN_TEMPLATE_MODAL,
    CLOSE_SETTINGS_EDITOR,
    CLOSE_TEMPLATE_EDITOR,
    OPEN_OPEN_TEMPLATE_MODAL,
    OPEN_SETTINGS_EDITOR,
    OPEN_TEMPLATE_EDITOR,
} from "../../../shared/constants";
import {
    ADD_STAGE_FILES,
    CLEAR_SELECTION_HISTORY,
    CLEAR_STAGED_FILES,
    DESELECT_FILES,
    JUMP_TO_PAST_SELECTION,
    SELECT_ANNOTATION,
    SELECT_BARCODE,
    SELECT_FILE,
    SELECT_METADATA,
    SELECT_USER,
    SELECT_WELLS,
    SELECT_WORKFLOW_PATH,
    SELECT_WORKFLOWS,
    SET_PLATE,
    SET_WELLS,
    TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
    UPDATE_STAGED_FILES,
} from "./constants";
import {
    AddStageFilesAction,
    ClearStagedFilesAction,
    CloseOpenTemplateModalAction,
    CloseSettingsEditorAction,
    CloseTemplateEditorAction,
    DeselectFilesAction,
    OpenOpenTemplateModalAction,
    OpenSettingsEditorAction,
    OpenTemplateEditorAction,
    SelectAnnotationAction,
    SelectBarcodeAction,
    SelectFileAction,
    SelectionStateBranch,
    SelectMetadataAction,
    SelectUserAction,
    SelectWellsAction,
    SelectWorkflowPathAction,
    SelectWorkflowsAction,
    SetPlateAction,
    SetWellsAction,
    ToggleExpandedUploadJobRowAction,
    UpdateStagedFilesAction,
} from "./types";

const DEFAULT_ANNOTATION = "Dataset";

export const initialState: SelectionStateBranch = {
    annotation: DEFAULT_ANNOTATION,
    barcode: undefined,
    expandedUploadJobRows: {},
    files: [],
    imagingSessionId: undefined,
    imagingSessionIds: [],
    openTemplateModalVisible: false,
    selectedWells: [],
    selectedWorkflows: [],
    settingsEditorVisible: false,
    stagedFiles: [],
    templateEditorVisible: false,
    user: userInfo().username,
    wells: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [DESELECT_FILES]: {
        accepts: (action: AnyAction): action is DeselectFilesAction => action.type === DESELECT_FILES,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            files: [],
        }),
    },
    [SELECT_ANNOTATION]: {
        accepts: (action: AnyAction): action is SelectAnnotationAction => action.type === SELECT_ANNOTATION,
        perform: (state: SelectionStateBranch, action: SelectAnnotationAction) => ({
            ...state,
            annotation: action.payload,
        }),
    },
    [SELECT_USER]: {
        accepts: (action: AnyAction): action is SelectUserAction => action.type === SELECT_USER,
        perform: (state: SelectionStateBranch, action: SelectUserAction) => ({
            ...state,
            user: action.payload,
        }),
    },
    [SELECT_BARCODE]: {
        accepts: (action: AnyAction): action is SelectBarcodeAction => action.type === SELECT_BARCODE,
        perform: (state: SelectionStateBranch, action: SelectBarcodeAction) => ({
            ...state,
            ...action.payload,
        }),
    },
    [SELECT_WORKFLOW_PATH]: {
        accepts: (action: AnyAction): action is SelectWorkflowPathAction => action.type === SELECT_WORKFLOW_PATH,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            barcode: undefined,
        }),
    },
    [SET_PLATE]: {
        accepts: (action: AnyAction): action is SetPlateAction => action.type === SET_PLATE,
        perform: (state: SelectionStateBranch, action: SetPlateAction) => ({
            ...state,
            plate: action.payload,
        }),
    },
    [SELECT_FILE]: {
        accepts: (action: AnyAction): action is SelectFileAction => action.type === SELECT_FILE,
        perform: (state: SelectionStateBranch, action: SelectFileAction) => ({
            ...state,
            files: [...castArray(action.payload)],
        }),
    },
    [SELECT_METADATA]: {
        accepts: (action: AnyAction): action is SelectMetadataAction => action.type === SELECT_METADATA,
        perform: (state: SelectionStateBranch, action: SelectMetadataAction) => ({
            ...state,
            [action.key]: action.payload,
        }),
    },
    [SELECT_WORKFLOWS]: {
        accepts: (action: AnyAction): action is SelectWorkflowsAction => action.type === SELECT_WORKFLOWS,
        perform: (state: SelectionStateBranch, action: SelectWorkflowsAction) => ({
            ...state,
            selectedWorkflows: action.payload,
        }),
    },
    [SET_WELLS]: {
        accepts: (action: AnyAction): action is SetWellsAction => action.type === SET_WELLS,
        perform: (state: SelectionStateBranch, action: SetWellsAction) => ({
            ...state,
            wells: action.payload,
        }),
    },
    [ADD_STAGE_FILES]: {
        accepts: (action: AnyAction): action is AddStageFilesAction => action.type === ADD_STAGE_FILES,
        perform: (state: SelectionStateBranch, action: AddStageFilesAction) => ({
            ...state,
            stagedFiles: [...state.stagedFiles, ...castArray(action.payload)],
        }),
    },
    [UPDATE_STAGED_FILES]: {
        accepts: (action: AnyAction): action is UpdateStagedFilesAction => action.type === UPDATE_STAGED_FILES,
        perform: (state: SelectionStateBranch, action: UpdateStagedFilesAction) => ({
            ...state,
            stagedFiles: action.payload,
        }),
    },
    [CLEAR_STAGED_FILES]: {
        accepts: (action: AnyAction): action is ClearStagedFilesAction => action.type === CLEAR_STAGED_FILES,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            stagedFiles: [],
        }),
    },
    [SET_WELLS]: {
        accepts: (action: AnyAction): action is SetWellsAction => action.type === SET_WELLS,
        perform: (state: SelectionStateBranch, action: SetWellsAction) => ({
            ...state,
            wells: action.payload,
        }),
    },
    [SELECT_WELLS]: {
        accepts: (action: AnyAction): action is SelectWellsAction => action.type === SELECT_WELLS,
        perform: (state: SelectionStateBranch, action: SelectWellsAction) => ({
            ...state,
            selectedWells: action.payload,
        }),
    },
    [OPEN_TEMPLATE_EDITOR]: {
        accepts: (action: AnyAction): action is OpenTemplateEditorAction => action.type === OPEN_TEMPLATE_EDITOR,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            templateEditorVisible: true,
        }),
    },
    [CLOSE_TEMPLATE_EDITOR]: {
        accepts: (action: AnyAction): action is CloseTemplateEditorAction => action.type === CLOSE_TEMPLATE_EDITOR,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            templateEditorVisible: false,
        }),
    },
    [OPEN_OPEN_TEMPLATE_MODAL]: {
        accepts: (action: AnyAction): action is OpenOpenTemplateModalAction => action.type === OPEN_OPEN_TEMPLATE_MODAL,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            openTemplateModalVisible: true,
        }),
    },
    [CLOSE_OPEN_TEMPLATE_MODAL]: {
        accepts: (action: AnyAction): action is CloseOpenTemplateModalAction =>
            action.type === CLOSE_OPEN_TEMPLATE_MODAL,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            openTemplateModalVisible: false,
        }),
    },
    [OPEN_SETTINGS_EDITOR]: {
        accepts: (action: AnyAction): action is OpenSettingsEditorAction => action.type === OPEN_SETTINGS_EDITOR,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            settingsEditorVisible: true,
        }),
    },
    [CLOSE_SETTINGS_EDITOR]: {
        accepts: (action: AnyAction): action is CloseSettingsEditorAction => action.type === CLOSE_SETTINGS_EDITOR,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            settingsEditorVisible: false,
        }),
    },
    [TOGGLE_EXPANDED_UPLOAD_JOB_ROW]: {
        accepts: (action: AnyAction): action is ToggleExpandedUploadJobRowAction =>
            action.type === TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
        perform: (state: SelectionStateBranch, action: ToggleExpandedUploadJobRowAction) => ({
            ...state,
            expandedUploadJobRows: {
                ...state.expandedUploadJobRows,
                [action.payload]: !state.expandedUploadJobRows[action.payload],
            },
        }),
    },
};

const selection = makeReducer<SelectionStateBranch>(actionToConfigMap, initialState);

const options: UndoableOptions = {
    clearHistoryType: CLEAR_SELECTION_HISTORY,
    filter: getReduxUndoFilterFn([]),
    initTypes: [RESET_HISTORY],
    jumpToPastType: JUMP_TO_PAST_SELECTION,
    limit: 100,
};
export default undoable(selection, options);
