import { createSelector } from "reselect";

import { JSSJobStatus } from "../../services/job-status-client/types";
import { ROW_COUNT_COLUMN } from "../constants";
import { MassEditRow, State } from "../types";

// BASIC SELECTORS
export const getCellAtDragStart = (state: State) =>
  state.selection.present.cellAtDragStart;
export const getRowsSelectedForDragEvent = (state: State) =>
  state.selection.present.rowsSelectedForDragEvent;
// TODO: Remove traces of removed
export const getWells = (state: State) => state.selection.present.wells;
export const getSelectedUser = (state: State) => state.selection.present.user;
export const getCurrentSelectionIndex = (state: State) => state.selection.index;
export const getRowsSelectedForMassEdit = (state: State) =>
  state.selection.present.rowsSelectedForMassEdit;
export const getSubFileSelectionModalFile = (state: State) =>
  state.selection.present.subFileSelectionModalFile;
export const getSelectedUploads = (state: State) =>
  state.selection.present.uploads;
export const getMassEditRow = (state: State) =>
  state.selection.present.massEditRow;
export const getPlateBarcodeToImagingSessions = (state: State) =>
  state.selection.present.plateBarcodeToImagingSessions;

// COMPOSED SELECTORS
export const NO_UNIT = "(Unit Not Found)";

export const getIsExistingUpload = createSelector(
  [getSelectedUploads],
  (uploads): boolean => uploads.length !== 0
);

export const getAreSelectedUploadsInFlight = createSelector(
  [getSelectedUploads],
  (selectedUploads): boolean =>
    selectedUploads.some(
      (upload) =>
        ![JSSJobStatus.SUCCEEDED, JSSJobStatus.FAILED].includes(upload.status)
    )
);

// Maps MassEditRow to shape of data needed by react-table
export const getMassEditRowAsTableRow = createSelector(
  [getMassEditRow, getRowsSelectedForMassEdit],
  (massEditRow, rowsSelectedForMassEdit): MassEditRow => ({
    ...(massEditRow && massEditRow),
    [ROW_COUNT_COLUMN]: rowsSelectedForMassEdit?.length,
  })
);
