import { basename, dirname } from "path";

import { AicsGridCell } from "@aics/aics-react-labkey";
import { createLogic } from "redux-logic";

import { GridCell } from "../../entities";
import {
  getPlateInfo,
  getUploadFilePromise,
  mergeChildPaths,
} from "../../util";
import { requestFailed } from "../actions";
import { setAlert, startLoading, stopLoading } from "../feedback/actions";
import {
  AlertType,
  AsyncRequest,
  DragAndDropFileList,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicTransformDependencies,
  UploadFile,
} from "../types";
import { addUploadFiles } from "../upload/actions";
import { batchActions } from "../util";

import { selectWells, setPlate } from "./actions";
import {
  LOAD_FILES,
  OPEN_FILES,
  SELECT_BARCODE,
  SELECT_WELLS,
} from "./constants";
import { getWellsWithModified } from "./selectors";

const stageFilesAndStopLoading = async (
  uploadFilePromises: Array<Promise<UploadFile>>,
  dispatch: ReduxLogicNextCb,
  done: ReduxLogicDoneCb
) => {
  try {
    const uploadFiles = await Promise.all(uploadFilePromises);
    // If the file drag/dropped is a folder directory just immediately grab the files underneath it
    // otherwise use the files drag/dropped as normal
    const filesToUpload =
      uploadFiles.length === 1 && uploadFiles[0].isDirectory
        ? uploadFiles.flatMap((file) => file.files)
        : uploadFiles;

    dispatch(stopLoading());
    dispatch(
      addUploadFiles(
        filesToUpload
          .filter((file) => !file.isDirectory)
          .map((file) => ({ file: file.fullPath }))
      )
    );
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
    done();
  }
};

const loadFilesLogic = createLogic({
  process: async (
    { action }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(startLoading());
    const filesToLoad: DragAndDropFileList = action.payload;

    const uploadFilePromises: Array<Promise<
      UploadFile
    >> = Array.from(filesToLoad, (fileToLoad) =>
      getUploadFilePromise(fileToLoad.name, dirname(fileToLoad.path))
    );

    await stageFilesAndStopLoading(uploadFilePromises, dispatch, done);
  },
  type: LOAD_FILES,
});

const openFilesLogic = createLogic({
  process: async (
    { action }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(startLoading());
    const filesToLoad: string[] = mergeChildPaths(action.payload);

    const uploadFilePromises: Array<Promise<
      UploadFile
    >> = filesToLoad.map((filePath: string) =>
      getUploadFilePromise(basename(filePath), dirname(filePath))
    );

    await stageFilesAndStopLoading(uploadFilePromises, dispatch, done);
  },
  type: OPEN_FILES,
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

export default [
  loadFilesLogic,
  openFilesLogic,
  selectBarcodeLogic,
  selectWellsLogic,
];
