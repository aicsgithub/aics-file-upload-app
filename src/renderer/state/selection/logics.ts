import { AicsGridCell } from "@aics/aics-react-labkey";
import { createLogic } from "redux-logic";

import { NOTES_ANNOTATION_NAME } from "../../constants";
import { GridCell } from "../../entities";
import { determineFilesFromNestedPaths, getPlateInfo } from "../../util";
import { requestFailed } from "../actions";
import { setAlert, startLoading, stopLoading } from "../feedback/actions";
import { getBooleanAnnotationTypeId } from "../metadata/selectors";
import { getAppliedTemplate } from "../template/selectors";
import {
  AlertType,
  AsyncRequest,
  MassEditRow,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  UploadRowTableId,
} from "../types";
import { addUploadFiles, updateUploadRows } from "../upload/actions";
import { getUpload } from "../upload/selectors";
import { batchActions } from "../util";

import { selectWells, setPlate } from "./actions";
import {
  APPLY_MASS_EDIT,
  LOAD_FILES,
  SELECT_BARCODE,
  SELECT_WELLS,
  START_MASS_EDIT,
  STOP_CELL_DRAG,
} from "./constants";
import {
  getCellAtDragStart,
  getMassEditRow,
  getRowsSelectedForDragEvent,
  getRowsSelectedForMassEdit,
  getWellsWithModified,
} from "./selectors";
import { LoadFilesAction } from "./types";

const loadFilesLogic = createLogic({
  process: async (
    deps: ReduxLogicProcessDependenciesWithAction<LoadFilesAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(startLoading());
    try {
      const filePaths = await determineFilesFromNestedPaths(
        deps.action.payload
      );
      dispatch(stopLoading());
      dispatch(addUploadFiles(filePaths.map((file) => ({ file }))));
      done();
    } catch (e) {
      dispatch(
        batchActions([
          stopLoading(),
          setAlert({
            message: `Encountered error while resolving files: ${e}`,
            type: AlertType.ERROR,
          }),
        ])
      );
    }

    done();
  },
  type: LOAD_FILES,
});

export const GENERIC_GET_WELLS_ERROR_MESSAGE = (barcode: string) =>
  `Could not retrieve wells for barcode ${barcode}`;

const selectBarcodeLogic = createLogic({
  process: async (
    { action, logger, mmsClient }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { barcode, imagingSessionIds } = action.payload;
    try {
      const { plate, wells } = await getPlateInfo(
        barcode,
        imagingSessionIds,
        mmsClient,
        dispatch
      );
      dispatch(setPlate(plate, wells, imagingSessionIds));
    } catch (e) {
      const error = "Could not get plate info: " + e.message;
      logger.error(e.message);
      dispatch(requestFailed(error, AsyncRequest.GET_PLATE));
    }

    done();
  },
  type: SELECT_BARCODE,
});

const selectWellsLogic = createLogic({
  transform: (
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const wells = getWellsWithModified(getState());
    const cells = action.payload;
    const filledCells = cells.filter(
      (cell: AicsGridCell) => wells[cell.row][cell.col].modified
    );
    const gridCells = filledCells.map(
      (cell: AicsGridCell) => new GridCell(cell.row, cell.col)
    );
    next(selectWells(gridCells));
  },
  type: SELECT_WELLS,
});

// Initialize massEditRow with necessary template annotations
const startMassEditLogic = createLogic({
  transform: (
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject?: ReduxLogicRejectCb
  ) => {
    const template = getAppliedTemplate(getState());
    const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
    if (!template || !booleanAnnotationTypeId) {
      reject && reject(action);
      return;
    }
    const { annotations } = template;
    const massEditRow = annotations.reduce(
      (row, annotation) => ({
        ...row,
        [annotation.name]: [],
      }),
      {}
    );
    next({
      ...action,
      payload: {
        massEditRow,
        rowsSelectedForMassEdit: action.payload,
      },
    });
  },
  type: START_MASS_EDIT,
});

const applyMassEditLogic = createLogic({
  process: (
    { ctx }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { rowIds, massEditRow } = ctx;
    const rowData = Object.entries(massEditRow as MassEditRow).reduce(
      (row, [key, value]) => ({
        ...row,
        // Exclude empty values
        ...((value.length || key === NOTES_ANNOTATION_NAME) && {
          [key]: value,
        }),
      }),
      {}
    );
    dispatch(updateUploadRows(rowIds, rowData));
    done();
  },
  transform: (
    { action, ctx, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const massEditRow = getMassEditRow(getState());
    const rowIds = getRowsSelectedForMassEdit(getState());
    ctx.massEditRow = massEditRow;
    ctx.rowIds = rowIds;
    next(action);
  },
  type: APPLY_MASS_EDIT,
});

const stopCellDragLogic = createLogic({
  process: (
    { ctx, getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { cellAtDragStart, rows } = ctx;
    if (cellAtDragStart && rows?.length) {
      const rowIds = rows.map((row: UploadRowTableId) => row.id);
      const upload = getUpload(getState());
      const value = upload[cellAtDragStart.rowId][cellAtDragStart.columnId];
      dispatch(updateUploadRows(rowIds, { [cellAtDragStart.columnId]: value }));
    }
    done();
  },
  transform: (
    { action, ctx, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const cellAtDragStart = getCellAtDragStart(getState());
    const rows = getRowsSelectedForDragEvent(getState());
    ctx.cellAtDragStart = cellAtDragStart;
    ctx.rows = rows;
    next(action);
  },
  type: STOP_CELL_DRAG,
});

export default [
  applyMassEditLogic,
  loadFilesLogic,
  selectBarcodeLogic,
  selectWellsLogic,
  startMassEditLogic,
  stopCellDragLogic,
];
