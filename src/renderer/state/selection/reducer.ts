import { userInfo } from "os";

import { AnyAction } from "redux";

import { VIEW_UPLOADS, RESET_UPLOAD } from "../route/constants";
import { ViewUploadsAction, ResetUploadAction } from "../route/types";
import {
  SelectionStateBranch,
  TypeToDescriptionMap,
  UploadTabSelections,
} from "../types";
import { REPLACE_UPLOAD, UPDATE_SUB_IMAGES } from "../upload/constants";
import { ReplaceUploadAction, UpdateSubImagesAction } from "../upload/types";
import { makeReducer } from "../util";

import {
  ADD_ROW_TO_DRAG_EVENT,
  APPLY_MASS_EDIT,
  CANCEL_MASS_EDIT,
  CLOSE_SUB_FILE_SELECTION_MODAL,
  OPEN_SUB_FILE_SELECTION_MODAL,
  REMOVE_ROW_FROM_DRAG_EVENT,
  START_CELL_DRAG,
  START_MASS_EDIT,
  STOP_CELL_DRAG,
  UPDATE_MASS_EDIT_ROW,
} from "./constants";
import {
  AddRowToDragEventAction,
  ApplyMassEditAction,
  CancelMassEditAction,
  CloseSubFileSelectionModalAction,
  OpenSubFileSelectionModalAction,
  RemoveRowFromDragEventAction,
  StartCellDragAction,
  StartMassEditAction,
  StopCellDragAction,
  UpdateMassEditRowAction,
} from "./types";

const uploadTabSelectionInitialState: UploadTabSelections = {
  cellAtDragStart: undefined,
  uploads: [],
  massEditRow: undefined,
  plateBarcodeToImagingSessions: {},
  rowsSelectedForMassEdit: undefined,
  subFileSelectionModalFile: undefined,
};

export const initialState: SelectionStateBranch = {
  ...uploadTabSelectionInitialState,
  user: userInfo().username,
};

const actionToConfigMap: TypeToDescriptionMap<SelectionStateBranch> = {
  [START_MASS_EDIT]: {
    accepts: (action: AnyAction): action is StartMassEditAction =>
      action.type === START_MASS_EDIT,
    perform: (state: SelectionStateBranch, action: StartMassEditAction) => ({
      ...state,
      ...action.payload,
    }),
  },
  [APPLY_MASS_EDIT]: {
    accepts: (action: AnyAction): action is ApplyMassEditAction =>
      action.type === APPLY_MASS_EDIT,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      massEditRow: undefined,
      rowsSelectedForMassEdit: undefined,
    }),
  },
  [CANCEL_MASS_EDIT]: {
    accepts: (action: AnyAction): action is CancelMassEditAction =>
      action.type === CANCEL_MASS_EDIT,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      massEditRow: undefined,
      rowsSelectedForMassEdit: undefined,
    }),
  },
  [UPDATE_SUB_IMAGES]: {
    accepts: (action: AnyAction): action is UpdateSubImagesAction =>
      action.type === UPDATE_SUB_IMAGES,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      subFileSelectionModalFile: undefined,
    }),
  },
  [CLOSE_SUB_FILE_SELECTION_MODAL]: {
    accepts: (action: AnyAction): action is CloseSubFileSelectionModalAction =>
      action.type === CLOSE_SUB_FILE_SELECTION_MODAL,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      subFileSelectionModalFile: undefined,
    }),
  },
  [OPEN_SUB_FILE_SELECTION_MODAL]: {
    accepts: (action: AnyAction): action is OpenSubFileSelectionModalAction =>
      action.type === OPEN_SUB_FILE_SELECTION_MODAL,
    perform: (
      state: SelectionStateBranch,
      action: OpenSubFileSelectionModalAction
    ) => ({
      ...state,
      subFileSelectionModalFile: action.payload,
    }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      ...uploadTabSelectionInitialState,
    }),
  },
  [RESET_UPLOAD]: {
    accepts: (action: AnyAction): action is ResetUploadAction =>
      action.type === RESET_UPLOAD,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      ...uploadTabSelectionInitialState,
    }),
  },
  [ADD_ROW_TO_DRAG_EVENT]: {
    accepts: (action: AnyAction): action is AddRowToDragEventAction =>
      action.type === ADD_ROW_TO_DRAG_EVENT,
    perform: (
      state: SelectionStateBranch,
      action: AddRowToDragEventAction
    ) => ({
      ...state,
      rowsSelectedForDragEvent: state.rowsSelectedForDragEvent?.find(
        (row) => row.id === action.payload.id
      )
        ? state.rowsSelectedForDragEvent
        : [...(state.rowsSelectedForDragEvent || []), action.payload],
    }),
  },
  [REMOVE_ROW_FROM_DRAG_EVENT]: {
    accepts: (action: AnyAction): action is RemoveRowFromDragEventAction =>
      action.type === REMOVE_ROW_FROM_DRAG_EVENT,
    perform: (
      state: SelectionStateBranch,
      action: RemoveRowFromDragEventAction
    ) => ({
      ...state,
      rowsSelectedForDragEvent: state.rowsSelectedForDragEvent?.filter(
        (row) => !action.payload.includes(row.id)
      ),
    }),
  },
  [START_CELL_DRAG]: {
    accepts: (action: AnyAction): action is StartCellDragAction =>
      action.type === START_CELL_DRAG,
    perform: (state: SelectionStateBranch, action: StartCellDragAction) => ({
      ...state,
      cellAtDragStart: action.payload,
    }),
  },
  [STOP_CELL_DRAG]: {
    accepts: (action: AnyAction): action is StopCellDragAction =>
      action.type === STOP_CELL_DRAG,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      cellAtDragStart: undefined,
      rowsSelectedForDragEvent: undefined,
    }),
  },
  [VIEW_UPLOADS]: {
    accepts: (action: AnyAction): action is ViewUploadsAction =>
      action.type === VIEW_UPLOADS,
    perform: (state: SelectionStateBranch, action: ViewUploadsAction) => ({
      ...state,
      uploads: action.payload,
    }),
  },
  [UPDATE_MASS_EDIT_ROW]: {
    accepts: (action: AnyAction): action is UpdateMassEditRowAction =>
      action.type === UPDATE_MASS_EDIT_ROW,
    perform: (
      state: SelectionStateBranch,
      action: UpdateMassEditRowAction
    ) => ({
      ...state,
      massEditRow: {
        ...state.massEditRow,
        ...action.payload,
      },
    }),
  },
};

export default makeReducer<SelectionStateBranch>(
  actionToConfigMap,
  initialState
);
