import { userInfo } from "os";

import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import { RESET_HISTORY } from "../metadata/constants";
import { VIEW_UPLOADS, RESET_UPLOAD } from "../route/constants";
import { ViewUploadsAction, ResetUploadAction } from "../route/types";
import {
  SelectionStateBranch,
  TypeToDescriptionMap,
  UploadTabSelections,
} from "../types";
import { REPLACE_UPLOAD, UPDATE_SUB_IMAGES } from "../upload/constants";
import { ReplaceUploadAction, UpdateSubImagesAction } from "../upload/types";
import { getReduxUndoFilterFn, makeReducer } from "../util";

import {
  ADD_ROW_TO_DRAG_EVENT,
  APPLY_MASS_EDIT,
  CANCEL_MASS_EDIT,
  CLEAR_SELECTION_HISTORY,
  CLOSE_SUB_FILE_SELECTION_MODAL,
  JUMP_TO_PAST_SELECTION,
  OPEN_SUB_FILE_SELECTION_MODAL,
  REMOVE_ROW_FROM_DRAG_EVENT,
  SELECT_BARCODE,
  SELECT_IMAGING_SESSION_ID,
  SELECT_METADATA,
  SELECT_WELLS,
  SET_HAS_NO_PLATE_TO_UPLOAD,
  SET_PLATE,
  START_CELL_DRAG,
  START_MASS_EDIT,
  STOP_CELL_DRAG,
  UPDATE_MASS_EDIT_ROW,
} from "./constants";
import {
  getHasNoPlateToUpload,
  getSelectedBarcode,
  getSelectedImagingSessionId,
  getSelectedImagingSessionIds,
  getSelectedPlates,
  getWells,
} from "./selectors";
import {
  AddRowToDragEventAction,
  ApplyMassEditAction,
  CancelMassEditAction,
  CloseSubFileSelectionModalAction,
  OpenSubFileSelectionModalAction,
  RemoveRowFromDragEventAction,
  SelectBarcodeAction,
  SelectImagingSessionIdAction,
  SelectMetadataAction,
  SelectWellsAction,
  SetHasNoPlateToUploadAction,
  SetPlateAction,
  StartCellDragAction,
  StartMassEditAction,
  StopCellDragAction,
  UpdateMassEditRowAction,
} from "./types";

const uploadTabSelectionInitialState: UploadTabSelections = {
  barcode: undefined,
  cellAtDragStart: undefined,
  imagingSessionId: undefined,
  imagingSessionIds: [],
  hasNoPlateToUpload: false,
  uploads: [],
  massEditRow: undefined,
  plate: {},
  selectedWells: [],
  rowsSelectedForMassEdit: undefined,
  subFileSelectionModalFile: undefined,
  wells: {},
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
  [SET_HAS_NO_PLATE_TO_UPLOAD]: {
    accepts: (action: AnyAction): action is SetHasNoPlateToUploadAction =>
      action.type === SET_HAS_NO_PLATE_TO_UPLOAD,
    perform: (
      state: SelectionStateBranch,
      action: SetHasNoPlateToUploadAction
    ) => ({
      ...state,
      barcode: undefined,
      imagingSessionId: undefined,
      imagingSessionIds: [],
      hasNoPlateToUpload: action.payload,
      plate: {},
      selectedWells: [],
      wells: {},
    }),
  },
  [SELECT_BARCODE]: {
    accepts: (action: AnyAction): action is SelectBarcodeAction =>
      action.type === SELECT_BARCODE,
    perform: (state: SelectionStateBranch, action: SelectBarcodeAction) => ({
      ...state,
      ...action.payload,
    }),
  },
  [SET_PLATE]: {
    accepts: (action: AnyAction): action is SetPlateAction =>
      action.type === SET_PLATE,
    perform: (
      state: SelectionStateBranch,
      { payload: { imagingSessionIds, plate, wells } }: SetPlateAction
    ) => ({
      ...state,
      hasNoPlateToUpload: false,
      imagingSessionId: imagingSessionIds[0] ?? undefined,
      imagingSessionIds,
      plate,
      wells,
    }),
  },
  [SELECT_METADATA]: {
    accepts: (action: AnyAction): action is SelectMetadataAction =>
      action.type === SELECT_METADATA,
    perform: (state: SelectionStateBranch, action: SelectMetadataAction) => ({
      ...state,
      [action.key]: action.payload,
    }),
  },
  [SELECT_WELLS]: {
    accepts: (action: AnyAction): action is SelectWellsAction =>
      action.type === SELECT_WELLS,
    perform: (state: SelectionStateBranch, action: SelectWellsAction) => {
      return {
        ...state,
        selectedWells: action.payload,
      };
    },
  },
  [SELECT_IMAGING_SESSION_ID]: {
    accepts: (action: AnyAction): action is SelectImagingSessionIdAction =>
      action.type === SELECT_IMAGING_SESSION_ID,
    perform: (
      state: SelectionStateBranch,
      action: SelectImagingSessionIdAction
    ) => ({
      ...state,
      imagingSessionId: action.payload,
    }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (
      state: SelectionStateBranch,
      { payload: { replacementState } }: ReplaceUploadAction
    ) => ({
      ...state,
      ...uploadTabSelectionInitialState,
      barcode: getSelectedBarcode(replacementState),
      imagingSessionId: getSelectedImagingSessionId(replacementState),
      imagingSessionIds: getSelectedImagingSessionIds(replacementState),
      hasNoPlateToUpload: getHasNoPlateToUpload(replacementState),
      plate: getSelectedPlates(replacementState),
      wells: getWells(replacementState),
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

const selection = makeReducer<SelectionStateBranch>(
  actionToConfigMap,
  initialState
);

const options: UndoableOptions = {
  clearHistoryType: CLEAR_SELECTION_HISTORY,
  filter: getReduxUndoFilterFn([]),
  initTypes: [RESET_HISTORY],
  jumpToPastType: JUMP_TO_PAST_SELECTION,
  limit: 100,
};
export default undoable(selection, options);
