import { existsSync } from "fs";
import { platform } from "os";

import { ImageModelMetadata } from "@aics/aicsfiles/type-declarations/types";
import { Menu, MenuItem } from "electron";
import { castArray, difference, isEmpty, isNil } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { WELL_ANNOTATION_NAME } from "../../constants";
import LabkeyClient from "../../services/labkey-client";
import MMSClient from "../../services/mms-client";
import {
  getSetAppliedTemplateAction,
  getSetPlateAction,
  getWithRetry,
  ensureDraftGetsSaved,
  makePosixPathCompatibleWithPlatform,
  retrieveFileMetadata,
} from "../../util";
import {
  openSetMountPointNotification,
  setErrorAlert,
} from "../feedback/actions";
import { updatePageHistory } from "../metadata/actions";
import {
  getSelectionHistory,
  getTemplateHistory,
  getUploadHistory,
  getWellAnnotation,
} from "../metadata/selectors";
import {
  clearSelectionHistory,
  jumpToPastSelection,
  selectBarcode,
} from "../selection/actions";
import { getCurrentSelectionIndex } from "../selection/selectors";
import { associateByWorkflow } from "../setting/actions";
import { getMountPoint } from "../setting/selectors";
import { clearTemplateHistory, jumpToPastTemplate } from "../template/actions";
import { getCurrentTemplateIndex } from "../template/selectors";
import { AsyncRequest, UploadMetadata, UploadStateBranch } from "../types";
import {
  Logger,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  State,
} from "../types";
import {
  clearUploadDraft,
  clearUploadHistory,
  jumpToPastUpload,
  updateUpload,
  updateUploads,
} from "../upload/actions";
import { getUploadRowKey } from "../upload/constants";
import { getCurrentUploadIndex, getUploadFiles } from "../upload/selectors";
import { batchActions } from "../util";

import {
  closeUploadTab,
  openEditFileMetadataTabFailed,
  openEditFileMetadataTabSucceeded,
  selectPage,
} from "./actions";
import {
  CLOSE_UPLOAD_TAB,
  findNextPage,
  GO_BACK,
  GO_FORWARD,
  OPEN_EDIT_FILE_METADATA_TAB,
  pageOrder,
  SELECT_PAGE,
} from "./constants";
import { getPage } from "./selectors";
import { Page, SelectPageAction } from "./types";

// have to cast here because Electron's typings for MenuItem is incomplete
const getFileMenu = (menu: Menu): MenuItem | undefined =>
  menu.items.find(
    (menuItem: MenuItem) => menuItem.label.toLowerCase() === "file"
  );

export const setSwitchEnvEnabled = (
  menu: Menu,
  enabled: boolean,
  logger: Logger
): void => {
  const fileMenu = getFileMenu(menu);
  if (!fileMenu || !fileMenu.submenu) {
    logger.error("Could not update application menu");
    return;
  }

  const switchEnvironmentMenuItem = fileMenu.submenu.items.find(
    (menuItem: MenuItem) =>
      menuItem.label.toLowerCase() === "switch environment"
  );
  if (switchEnvironmentMenuItem) {
    switchEnvironmentMenuItem.enabled = enabled;
  } else {
    logger.error("Could not update application menu");
  }
};

const stateBranchHistory = [
  {
    clearHistory: clearSelectionHistory,
    getHistory: getSelectionHistory,
    jumpToPast: jumpToPastSelection,
  },
  {
    clearHistory: clearTemplateHistory,
    getHistory: getTemplateHistory,
    jumpToPast: jumpToPastTemplate,
  },
  {
    clearHistory: clearUploadHistory,
    getHistory: getUploadHistory,
    jumpToPast: jumpToPastUpload,
  },
];
const pagesToAllowSwitchingEnvironments = [
  Page.UploadSummary,
  Page.DragAndDrop,
];

export const handleGoingToNextPage = (
  logger: Logger,
  state: State,
  getApplicationMenu: () => Menu | null,
  selectPageAction: SelectPageAction
) => {
  const actions: AnyAction[] = [selectPageAction];
  if (selectPageAction.payload.nextPage === Page.DragAndDrop) {
    const isMountedAsExpected = existsSync(
      makePosixPathCompatibleWithPlatform("/allen/aics", platform())
    );
    const mountPoint = getMountPoint(state);
    if (!isMountedAsExpected && !mountPoint) {
      actions.push(openSetMountPointNotification());
    }
  }

  const menu = getApplicationMenu();
  if (menu) {
    setSwitchEnvEnabled(
      menu,
      pagesToAllowSwitchingEnvironments.includes(
        selectPageAction.payload.nextPage
      ),
      logger
    );
  }

  return actions;
};

// Returns common actions needed because we share the upload tab between upload drafts for now
// Some of these actions cannot be done in the reducer because they are handled by a higher-order reducer
// from redux-undo.
// Also handles disabling the Switch Environment menu item and showing a notification
// depending on the next page.
export const handleGoingToNextPageForNewUpload = (
  logger: Logger,
  state: State,
  getApplicationMenu: () => Menu | null,
  nextPage: Page
): AnyAction[] => {
  return [
    ...handleGoingToNextPage(
      logger,
      state,
      getApplicationMenu,
      selectPage(getPage(state), nextPage)
    ),
    clearUploadDraft(),
    clearUploadHistory(),
    clearSelectionHistory(),
    clearTemplateHistory(),
  ];
};

export const getSelectPageActions = (
  logger: Logger,
  state: State,
  getApplicationMenu: () => Menu | null,
  action: SelectPageAction
) => {
  const {
    payload: { currentPage, nextPage },
  } = action;
  const actions: AnyAction[] = handleGoingToNextPage(
    logger,
    state,
    getApplicationMenu,
    action
  );

  const nextPageOrder: number = pageOrder.indexOf(nextPage);
  const currentPageOrder: number = pageOrder.indexOf(currentPage);

  // going back - rewind selections, uploads & template to the state they were at when user was on previous page
  if (nextPageOrder < currentPageOrder) {
    stateBranchHistory.forEach((history) => {
      const historyForThisStateBranch = history.getHistory(state);

      if (nextPageOrder === 0 && currentPageOrder === pageOrder.length - 1) {
        actions.push(history.clearHistory(), history.jumpToPast(0));
      } else if (
        historyForThisStateBranch &&
        !isNil(historyForThisStateBranch[nextPage])
      ) {
        const index = historyForThisStateBranch[nextPage];
        actions.push(history.jumpToPast(index));
      }
    });
  } else if (nextPage === Page.UploadSummary) {
    stateBranchHistory.forEach((history) =>
      actions.push(history.jumpToPast(0), history.clearHistory())
    );
    actions.push(closeUploadTab());

    // going forward - store current selection/upload indexes so we can rewind to this state if user goes back
  } else if (nextPageOrder > currentPageOrder) {
    const selectionIndex = getCurrentSelectionIndex(state);
    const uploadIndex = getCurrentUploadIndex(state);
    const templateIndex = getCurrentTemplateIndex(state);
    actions.push(
      updatePageHistory(currentPage, selectionIndex, uploadIndex, templateIndex)
    );
    if (nextPage === Page.SelectStorageLocation) {
      const files = getUploadFiles(state);
      const uploadPartial = {
        shouldBeInArchive: true,
        shouldBeInLocal: true,
      };
      actions.push(
        ...files.map((file: string) =>
          updateUpload(getUploadRowKey({ file }), uploadPartial)
        )
      );
    }
  }
  return actions;
};

const selectPageLogic = createLogic({
  process: (
    {
      action,
      getApplicationMenu,
      getState,
      logger,
    }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const actions = getSelectPageActions(
      logger,
      getState(),
      getApplicationMenu,
      action as SelectPageAction
    );

    if (!isEmpty(actions)) {
      dispatch(batchActions(actions));
    }

    done();
  },
  type: SELECT_PAGE,
});

const goBackLogic = createLogic({
  type: GO_BACK,
  validate: async (
    { dialog, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const state = getState();
    const currentPage = getPage(state);
    const nextPage = findNextPage(currentPage, -1);

    if (nextPage) {
      const {
        response: buttonIndex,
      }: Electron.MessageBoxReturnValue = await dialog.showMessageBox({
        buttons: ["Cancel", "Yes"],
        cancelId: 0,
        defaultId: 1,
        message: "Changes will be lost if you go back. Are you sure?",
        title: "Warning",
        type: "warning",
      });
      // index of button clicked
      if (buttonIndex === 1) {
        next(selectPage(currentPage, nextPage));
      } else {
        reject({ type: "ignore" });
      }
    } else {
      reject({ type: "ignore" });
    }
  },
});

const goForwardLogic = createLogic({
  type: GO_FORWARD,
  validate: (
    { getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const currentPage = getPage(getState());
    const nextPage = findNextPage(currentPage, 1);

    if (nextPage) {
      next(selectPage(currentPage, nextPage));
    } else {
      reject({ type: "ignore" });
    }
  },
});

const closeUploadTabLogic = createLogic({
  type: CLOSE_UPLOAD_TAB,
  validate: async (
    deps: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { action, getApplicationMenu, getState, logger } = deps;
    try {
      const { cancelled } = await ensureDraftGetsSaved(deps);

      if (cancelled) {
        // prevent action from getting to reducer
        reject({ type: "ignore" });
      }
    } catch (e) {
      reject(setErrorAlert(e.message));
      return;
    }

    const currentPage = getPage(getState());
    const selectPageAction: SelectPageAction = selectPage(
      currentPage,
      Page.UploadSummary
    );
    next({
      // we want to write to local storage but also keep this as a batched action
      ...clearUploadDraft(),
      ...batchActions([
        action,
        ...getSelectPageActions(
          logger,
          getState(),
          getApplicationMenu,
          selectPageAction
        ),
      ]),
    });
  },
});

const convertImageModelMetadataToUploadStateBranch = (
  metadata: ImageModelMetadata[]
): UploadStateBranch => {
  return metadata.reduce(
    (accum: UploadStateBranch, curr: ImageModelMetadata) => {
      const {
        archiveFilePath,
        channelId,
        localFilePath,
        positionIndex,
        scene,
        subImageName,
      } = curr;
      const file = localFilePath || archiveFilePath || "";
      const key: string = getUploadRowKey({
        channelId,
        file,
        positionIndex,
        scene,
        subImageName,
      });
      return {
        ...accum,
        [key]: {
          ...curr,
          barcode: curr.barcode ? `${curr.barcode}` : undefined,
          file,
        },
      };
    },
    {} as UploadStateBranch
  );
};

const getPlateRelatedActions = async (
  wellIds: number[],
  labkeyClient: LabkeyClient,
  mmsClient: MMSClient,
  dispatch: ReduxLogicNextCb
) => {
  const actions: AnyAction[] = [];
  wellIds = castArray(wellIds).map((w: string | number) =>
    parseInt(w + "", 10)
  );
  // assume all wells have same barcode
  const wellId = wellIds[0];
  // we want to find the barcode associated with any well id found in this upload
  const barcode = await labkeyClient.getPlateBarcodeAndAllImagingSessionIdsFromWellId(
    wellId
  );
  const imagingSessionIds = await labkeyClient.getImagingSessionIdsForBarcode(
    barcode
  );
  const setPlateAction = await getSetPlateAction(
    barcode,
    imagingSessionIds,
    mmsClient,
    dispatch
  );
  actions.push(selectBarcode(barcode, imagingSessionIds), setPlateAction);

  return actions;
};

const openEditFileMetadataTabLogic = createLogic({
  process: async (
    {
      ctx,
      fms,
      getApplicationMenu,
      getState,
      labkeyClient,
      logger,
      mmsClient,
    }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const state = getState();
    // Open the upload tab and make sure application menu gets updated and redux-undo histories reset.
    dispatch(
      batchActions(
        handleGoingToNextPageForNewUpload(
          logger,
          state,
          getApplicationMenu,
          Page.AddCustomData
        )
      )
    );

    // Second, we fetch the file metadata for the fileIds acquired in the validate phase
    const { fileIds } = ctx;
    let fileMetadataForJob: ImageModelMetadata[];
    const request = () => retrieveFileMetadata(fileIds, fms);
    try {
      fileMetadataForJob = await getWithRetry(
        request,
        AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB,
        dispatch,
        "MMS"
      );
    } catch (e) {
      const error = `Could not retrieve file metadata for fileIds=${fileIds.join(
        ", "
      )}: ${e.message}`;
      logger.error(error);
      dispatch(openEditFileMetadataTabFailed(error));
      done();
      return;
    }

    let updateUploadsAction: AnyAction = updateUploads({}, true);
    const actions: AnyAction[] = [];
    const newUpload = convertImageModelMetadataToUploadStateBranch(
      fileMetadataForJob
    );
    if (fileMetadataForJob && fileMetadataForJob[0]) {
      // if we have a well, we can get the barcode and other plate info. This will be necessary
      // to display the well editor
      const wellAnnotationName =
        getWellAnnotation(getState())?.name || WELL_ANNOTATION_NAME;
      let wellIds: any = fileMetadataForJob[0][wellAnnotationName];
      if (wellIds) {
        wellIds = castArray(wellIds).map((w: string | number) =>
          parseInt(w + "", 10)
        );
        try {
          const plateRelatedActions = await getPlateRelatedActions(
            wellIds,
            labkeyClient,
            mmsClient,
            dispatch
          );
          actions.push(...plateRelatedActions);
        } catch (e) {
          const error = `Could not get plate information from upload: ${e.message}`;
          logger.error(error);
          dispatch(openEditFileMetadataTabFailed(error));
          done();
          return;
        }
      } else {
        actions.push(associateByWorkflow(true));
      }

      // Currently we only allow applying one template at a time
      if (fileMetadataForJob[0].templateId) {
        updateUploadsAction = await getSetAppliedTemplateAction(
          fileMetadataForJob[0].templateId,
          getState,
          mmsClient,
          dispatch,
          newUpload
        );
      } else {
        updateUploadsAction = updateUploads(newUpload, true);
      }
    }

    dispatch(
      batchActions([
        ...actions,
        updateUploadsAction,
        openEditFileMetadataTabSucceeded(updateUploadsAction.payload.uploads),
      ])
    );
    done();
  },
  type: OPEN_EDIT_FILE_METADATA_TAB,
  validate: async (
    deps: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { action, ctx, logger } = deps;
    try {
      const { cancelled } = await ensureDraftGetsSaved(deps);
      if (cancelled) {
        reject({ type: "ignore" });
        return;
      }
    } catch (e) {
      reject(setErrorAlert(e.message));
      return;
    }

    // Validate the job passed in as the action payload
    const { payload: job } = action;
    if (job.status !== "SUCCEEDED") {
      reject(
        setErrorAlert(
          "Cannot update file metadata because upload has not succeeded"
        )
      );
    } else if (
      Array.isArray(job?.serviceFields?.result) &&
      !isEmpty(job?.serviceFields?.result)
    ) {
      const originalFileIds = job.serviceFields.result.map(
        ({ fileId }: UploadMetadata) => fileId
      );
      const deletedFileIds = job.serviceFields.deletedFileIds
        ? castArray(job.serviceFields.deletedFileIds)
        : [];
      ctx.fileIds = difference(originalFileIds, deletedFileIds);
      if (isEmpty(ctx.fileIds)) {
        reject(setErrorAlert("All files in this upload have been deleted!"));
      } else {
        next(action);
      }
    } else {
      logger.error("No fileIds found in selected Job:", job);
      reject(setErrorAlert("No fileIds found in selected Job."));
    }
  },
});

export default [
  closeUploadTabLogic,
  goBackLogic,
  goForwardLogic,
  openEditFileMetadataTabLogic,
  selectPageLogic,
];
