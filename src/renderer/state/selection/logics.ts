import { basename, dirname } from "path";

import { AicsGridCell } from "@aics/aics-react-labkey";
import { createLogic } from "redux-logic";

import { GridCell } from "../../components/AssociateWells/grid-cell";
import {
  getPlateInfo,
  getUploadFilePromise,
  mergeChildPaths,
} from "../../util";
import { requestFailed } from "../actions";
import { setAlert, startLoading, stopLoading } from "../feedback/actions";
import { selectPage } from "../route/actions";
import { findNextPage } from "../route/constants";
import { getSelectPageActions } from "../route/logics";
import { getPage } from "../route/selectors";
import { associateByWorkflow } from "../setting/actions";
import {
  AlertType,
  AsyncRequest,
  Page,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  UploadFile,
} from "../types";
import { clearUpload } from "../upload/actions";
import { getUpload } from "../upload/selectors";
import { batchActions, getActionFromBatch } from "../util";

import {
  deselectFiles,
  selectWells,
  setPlate,
  stageFiles,
  updateStagedFiles,
} from "./actions";
import {
  CLEAR_STAGED_FILES,
  GET_FILES_IN_FOLDER,
  LOAD_FILES,
  OPEN_FILES,
  SELECT_BARCODE,
  SELECT_WELLS,
  SELECT_WORKFLOW_PATH,
} from "./constants";
import {
  getSelectedBarcode,
  getStagedFiles,
  getWellsWithModified,
} from "./selectors";
import { DragAndDropFileList } from "./types";

const stageFilesAndStopLoading = async (
  uploadFilePromises: Array<Promise<UploadFile>>,
  currentPage: Page,
  dispatch: ReduxLogicNextCb,
  done: ReduxLogicDoneCb
) => {
  try {
    const uploadFiles = await Promise.all(uploadFilePromises);
    dispatch(batchActions([stopLoading(), stageFiles(uploadFiles)]));
    if (currentPage === Page.DragAndDrop) {
      dispatch(
        selectPage(
          currentPage,
          findNextPage(currentPage, 1) || Page.SelectUploadType
        )
      );
    }
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
    { action, getState }: ReduxLogicProcessDependencies,
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

    await stageFilesAndStopLoading(
      uploadFilePromises,
      getPage(getState()),
      dispatch,
      done
    );
  },
  type: LOAD_FILES,
});

const openFilesLogic = createLogic({
  process: async (
    { action, getState }: ReduxLogicProcessDependencies,
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

    await stageFilesAndStopLoading(
      uploadFilePromises,
      getPage(getState()),
      dispatch,
      done
    );
  },
  type: OPEN_FILES,
});

const getNewStagedFiles = (
  files: UploadFile[],
  fileToUpdate: UploadFile
): UploadFile[] => {
  return files.map((file: UploadFile) => {
    if (file.fullPath === fileToUpdate.fullPath) {
      return fileToUpdate;
    } else if (fileToUpdate.fullPath.startsWith(file.fullPath)) {
      file.files = getNewStagedFiles(file.files, fileToUpdate);
      return file;
    }

    return file;
  });
};

const getFilesInFolderLogic = createLogic({
  transform: async (
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const folder: UploadFile = action.payload;
    try {
      folder.files = await Promise.all(await folder.loadFiles());
      const stagedFiles = [...getStagedFiles(getState())];
      next(updateStagedFiles(getNewStagedFiles(stagedFiles, folder)));
    } catch (e) {
      next(
        setAlert({
          message: `Encountered error while resolving files: ${e}`,
          type: AlertType.ERROR,
        })
      );
    }
  },
  type: GET_FILES_IN_FOLDER,
});

export const GENERIC_GET_WELLS_ERROR_MESSAGE = (barcode: string) =>
  `Could not retrieve wells for barcode ${barcode}`;

const selectBarcodeLogic = createLogic({
  process: async (
    {
      action,
      getApplicationMenu,
      getState,
      logger,
      mmsClient,
    }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { barcode, imagingSessionIds } = action.payload;
    const nextPage =
      findNextPage(Page.SelectUploadType, 1) || Page.AssociateFiles;
    const selectPageActions = getSelectPageActions(
      logger,
      getState(),
      getApplicationMenu,
      selectPage(Page.SelectUploadType, nextPage)
    );
    try {
      const { plate, wells } = await getPlateInfo(
        barcode,
        imagingSessionIds,
        mmsClient,
        dispatch
      );
      dispatch(batchActions([...selectPageActions, setPlate(plate, wells)]));
    } catch (e) {
      const error = "Could not get plate info: " + e.message;
      logger.error(e.message);
      dispatch(requestFailed(error, AsyncRequest.GET_PLATE));
    }

    done();
  },
  type: SELECT_BARCODE,
});

const selectWorkflowPathLogic = createLogic({
  process: (
    deps: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const action = getActionFromBatch(deps.action, SELECT_WORKFLOW_PATH);

    if (action) {
      const actions = [action, associateByWorkflow(true)];
      const nextPage =
        findNextPage(Page.SelectUploadType, 1) || Page.AssociateFiles;
      dispatch(batchActions(actions));
      dispatch(selectPage(Page.SelectUploadType, nextPage));
    }
    done();
  },
  type: SELECT_WORKFLOW_PATH,
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

const clearStagedFilesLogic = createLogic({
  type: CLEAR_STAGED_FILES,
  validate: async (
    { action, dialog, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const uploads = getUpload(getState());

    if (Object.keys(uploads).length) {
      const barcode = getSelectedBarcode(getState());
      const associationType = barcode ? "well" : "workflow";
      const { response: buttonIndex } = await dialog.showMessageBox({
        buttons: ["Cancel", "Clear All Files And Associations"],
        cancelId: 0,
        defaultId: 1,
        message: `You have files with ${associationType} associations. How would you like to proceed?`,
        title: "Warning",
        type: "warning",
      });
      if (buttonIndex === 0) {
        // cancel
        // The types for redux-logic expect an action to be passed to the reject callback.
        // Since we don't want to do anything, we're sending a dummy action
        reject({ type: "ignore" });
      } else {
        // clear everything
        next(batchActions([action, clearUpload(), deselectFiles()]));
      }
    }
  },
});

export default [
  clearStagedFilesLogic,
  loadFilesLogic,
  openFilesLogic,
  getFilesInFolderLogic,
  selectBarcodeLogic,
  selectWellsLogic,
  selectWorkflowPathLogic,
];
