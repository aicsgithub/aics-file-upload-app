import { castArray } from "lodash";
import { AnyAction } from "redux";
import undoable, {
    excludeAction,
    UndoableOptions,
} from "redux-undo";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import {
    ADD_STAGE_FILES,
    DESELECT_FILES,
    JUMP_TO_PAST_SELECTION,
    SELECT_BARCODE,
    SELECT_FILE,
    SELECT_METADATA,
    SELECT_PAGE,
    SELECT_WELLS,
    SET_PLATE,
    SET_WELL,
    SET_WELLS,
    UPDATE_STAGED_FILES,
} from "./constants";
import {
    AddStageFilesAction,
    DeselectFilesAction,
    Page,
    SelectBarcodeAction,
    SelectFileAction,
    SelectionStateBranch,
    SelectMetadataAction,
    SelectPageAction,
    SelectWellsAction,
    SetPlateAction,
    SetWellAction,
    SetWellsAction,
    UpdateStagedFilesAction,
} from "./types";

export const initialState = {
    barcode: undefined,
    files: [],
    imagingSessionId: undefined,
    imagingSessionIds: [],
    page: Page.DragAndDrop,
    stagedFiles: [],
    startHistoryIndex: {
        [Page.DragAndDrop]: 0,
    },
    selectedWells: [],
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
    [SELECT_BARCODE]: {
        accepts: (action: AnyAction): action is SelectBarcodeAction => action.type === SELECT_BARCODE,
        perform: (state: SelectionStateBranch, action: SelectBarcodeAction) => ({
            ...state,
            ...action.payload,
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
    [SELECT_PAGE]: {
        accepts: (action: AnyAction): action is SelectPageAction => action.type === SELECT_PAGE,
        perform: (state: SelectionStateBranch, action: SelectPageAction) => ({
            ...state,
            page: action.payload.nextPage,
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
    [SET_WELL]: {
        accepts: (action: AnyAction): action is SetWellAction => action.type === SET_WELL,
        perform: (state: SelectionStateBranch, action: SetWellAction) => ({
            ...state,
            selectedWells: [action.payload],
        }),
    },
};

const selection = makeReducer<SelectionStateBranch>(actionToConfigMap, initialState);

const options: UndoableOptions = {
    filter: excludeAction( SELECT_PAGE),
    jumpToPastType: JUMP_TO_PAST_SELECTION,
    limit: 100,
};
export default undoable(selection, options);
