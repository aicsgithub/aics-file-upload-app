import { castArray } from "lodash";
import { userInfo } from "os";
import { AnyAction } from "redux";
import undoable, {
    UndoableOptions,
} from "redux-undo";
import { RESET_HISTORY } from "../metadata/constants";

import { TypeToDescriptionMap } from "../types";
import { REPLACE_UPLOAD } from "../upload/constants";
import { ReplaceUploadAction } from "../upload/types";
import { getReduxUndoFilterFn, makeReducer } from "../util";

import {
    ADD_STAGE_FILES,
    CLEAR_SELECTION_HISTORY,
    CLEAR_STAGED_FILES,
    DESELECT_FILES,
    JUMP_TO_PAST_SELECTION,
    SELECT_ANNOTATION,
    SELECT_BARCODE,
    SELECT_FILE,
    SELECT_IMAGING_SESSION_ID,
    SELECT_METADATA,
    SELECT_USER,
    SELECT_WELLS,
    SELECT_WORKFLOW_PATH,
    SELECT_WORKFLOWS,
    SET_PLATE,
    SET_WELLS,
    TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
    TOGGLE_FOLDER_TREE,
    UPDATE_STAGED_FILES,
} from "./constants";
import {
    getExpandedUploadJobRows,
    getFolderTreeOpen,
    getSelectedBarcode,
    getSelectedImagingSessionId,
    getSelectedImagingSessionIds,
    getSelectedPlates,
    getStagedFiles, getWells,
} from "./selectors";
import {
    AddStageFilesAction,
    ClearStagedFilesAction,
    DeselectFilesAction,
    SelectAnnotationAction,
    SelectBarcodeAction,
    SelectFileAction,
    SelectImagingSessionIdAction,
    SelectionStateBranch,
    SelectMetadataAction,
    SelectUserAction,
    SelectWellsAction,
    SelectWorkflowPathAction,
    SelectWorkflowsAction,
    SetPlateAction,
    SetWellsAction,
    ToggleExpandedUploadJobRowAction,
    ToggleFolderTreeAction,
    UpdateStagedFilesAction,
} from "./types";

const DEFAULT_ANNOTATION = "Dataset";

export const initialState: SelectionStateBranch = {
    annotation: DEFAULT_ANNOTATION,
    barcode: undefined,
    expandedUploadJobRows: {},
    files: [],
    folderTreeOpen: true,
    imagingSessionId: undefined,
    imagingSessionIds: [],
    plate: {},
    selectedWells: [],
    selectedWorkflows: [],
    stagedFiles: [],
    user: userInfo().username,
    wells: {},
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
    [SELECT_WELLS]: {
        accepts: (action: AnyAction): action is SelectWellsAction => action.type === SELECT_WELLS,
        perform: (state: SelectionStateBranch, action: SelectWellsAction) => {
            return {
                ...state,
                selectedWells: action.payload,
            };
        },
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
    [TOGGLE_FOLDER_TREE]: {
        accepts: (action: AnyAction): action is ToggleFolderTreeAction => action.type === TOGGLE_FOLDER_TREE,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            folderTreeOpen: !state.folderTreeOpen,
        }),
    },
    [SELECT_IMAGING_SESSION_ID]: {
        accepts: (action: AnyAction): action is SelectImagingSessionIdAction =>
            action.type === SELECT_IMAGING_SESSION_ID,
        perform: (state: SelectionStateBranch, action: SelectImagingSessionIdAction) => ({
            ...state,
            imagingSessionId: action.payload,
        }),
    },
    [REPLACE_UPLOAD]: {
        accepts: (action: AnyAction): action is ReplaceUploadAction => action.type === REPLACE_UPLOAD,
        perform: (state: SelectionStateBranch, { payload: { state: savedState } }: ReplaceUploadAction) => ({
            ...state,
            barcode: getSelectedBarcode(savedState),
            expandedUploadJobRows: getExpandedUploadJobRows(savedState),
            folderTreeOpen: getFolderTreeOpen(savedState),
            imagingSessionId: getSelectedImagingSessionId(savedState),
            imagingSessionIds: getSelectedImagingSessionIds(savedState),
            plate: getSelectedPlates(savedState), //  todo might want to get this again?
            stagedFiles: getStagedFiles(savedState), // todo check that these still exist on computer
            wells: getWells(savedState),
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
