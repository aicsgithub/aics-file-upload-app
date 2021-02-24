import { userInfo } from "os";

import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import { RESET_HISTORY } from "../metadata/constants";
import { OPEN_EDIT_FILE_METADATA_TAB, RESET_UPLOAD } from "../route/constants";
import {
  OpenEditFileMetadataTabAction,
  ResetUploadAction,
} from "../route/types";
import {
  SelectionStateBranch,
  TypeToDescriptionMap,
  UploadTabSelections,
} from "../types";
import { REPLACE_UPLOAD } from "../upload/constants";
import { ReplaceUploadAction } from "../upload/types";
import { getReduxUndoFilterFn, makeReducer } from "../util";

import {
  CLEAR_SELECTION_HISTORY,
  JUMP_TO_PAST_SELECTION,
  SELECT_BARCODE,
  SELECT_IMAGING_SESSION_ID,
  SELECT_METADATA,
  SELECT_WELLS,
  SET_HAS_NO_PLATE_TO_UPLOAD,
  SET_PLATE,
  TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
  UPDATE_MASS_EDIT_ROW,
} from "./constants";
import {
  getExpandedUploadJobRows,
  getHasNoPlateToUpload,
  getSelectedBarcode,
  getSelectedImagingSessionId,
  getSelectedImagingSessionIds,
  getSelectedPlates,
  getWells,
} from "./selectors";
import {
  SelectBarcodeAction,
  SelectImagingSessionIdAction,
  SelectMetadataAction,
  SelectWellsAction,
  SetHasNoPlateToUploadAction,
  SetPlateAction,
  ToggleExpandedUploadJobRowAction,
  UpdateMassEditRowAction,
} from "./types";

const uploadTabSelectionInitialState: UploadTabSelections = {
  barcode: undefined,
  expandedUploadJobRows: {},
  imagingSessionId: undefined,
  imagingSessionIds: [],
  hasNoPlateToUpload: false,
  job: undefined,
  plate: {},
  selectedWells: [],
  wells: {},
};

export const initialState: SelectionStateBranch = {
  ...uploadTabSelectionInitialState,
  massEditRow: {},
  user: userInfo().username,
};

const actionToConfigMap: TypeToDescriptionMap<SelectionStateBranch> = {
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
  [TOGGLE_EXPANDED_UPLOAD_JOB_ROW]: {
    accepts: (action: AnyAction): action is ToggleExpandedUploadJobRowAction =>
      action.type === TOGGLE_EXPANDED_UPLOAD_JOB_ROW,
    perform: (
      state: SelectionStateBranch,
      action: ToggleExpandedUploadJobRowAction
    ) => ({
      ...state,
      expandedUploadJobRows: {
        ...state.expandedUploadJobRows,
        [action.payload]: !state.expandedUploadJobRows[action.payload],
      },
    }),
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
      expandedUploadJobRows: getExpandedUploadJobRows(replacementState),
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
  [OPEN_EDIT_FILE_METADATA_TAB]: {
    accepts: (action: AnyAction): action is OpenEditFileMetadataTabAction =>
      action.type === OPEN_EDIT_FILE_METADATA_TAB,
    perform: (
      state: SelectionStateBranch,
      action: OpenEditFileMetadataTabAction
    ) => ({
      ...state,
      job: action.payload,
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
      massEditRow: action.payload,
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
