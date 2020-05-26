import { existsSync } from "fs";
import { platform } from "os";

import { ImageModelMetadata } from "@aics/aicsfiles/type-declarations/types";
import { Menu, MenuItem } from "electron";
import { castArray, difference, isEmpty, isNil } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import {
  getCurrentUploadKey,
  getCurrentUploadName,
} from "../../containers/App/selectors";
import {
  getSetAppliedTemplateAction,
  getSetPlateAction,
  getWithRetry,
  makePosixPathCompatibleWithPlatform,
  retrieveFileMetadata,
} from "../../util";
import {
  openModal,
  openSetMountPointNotification,
  removeRequestFromInProgress,
  setDeferredAction,
  setErrorAlert,
  setUploadError,
} from "../feedback/actions";
import { AsyncRequest, ModalName } from "../feedback/types";
import { receiveFileMetadata, updatePageHistory } from "../metadata/actions";
import {
  getSelectionHistory,
  getTemplateHistory,
  getUploadHistory,
  getWellAnnotation,
} from "../metadata/selectors";
import { CurrentUpload } from "../metadata/types";
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
import {
  LocalStorage,
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
import {
  getCanSaveUploadDraft,
  getCurrentUploadIndex,
  getUploadFiles,
} from "../upload/selectors";
import { UploadMetadata, UploadStateBranch } from "../upload/types";
import { batchActions } from "../util";

import { closeUploadTab, selectPage, selectView } from "./actions";
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

interface MenuItemWithSubMenu extends MenuItem {
  submenu?: Menu;
}

// have to cast here because Electron's typings for MenuItem is incomplete
const getFileMenu = (menu: Menu): MenuItemWithSubMenu | undefined =>
  menu.items.find(
    (menuItem: MenuItem) => menuItem.label.toLowerCase() === "file"
  ) as MenuItemWithSubMenu | undefined;

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
export const getSelectPageActions = (
  logger: Logger,
  state: State,
  getApplicationMenu: () => Menu | null,
  action: SelectPageAction
) => {
  const {
    payload: { currentPage, nextPage },
  } = action;
  const actions: AnyAction[] = [action];
  if (nextPage === Page.DragAndDrop) {
    const isMountedAsExpected = existsSync(
      makePosixPathCompatibleWithPlatform("/allen/aics", platform())
    );
    const mountPoint = getMountPoint(state);
    if (!isMountedAsExpected && !mountPoint) {
      actions.push(openSetMountPointNotification());
    }
  }

  const nextPageOrder: number = pageOrder.indexOf(nextPage);
  const currentPageOrder: number = pageOrder.indexOf(currentPage);

  const menu = getApplicationMenu();
  if (menu) {
    setSwitchEnvEnabled(
      menu,
      pagesToAllowSwitchingEnvironments.includes(nextPage),
      logger
    );
  }

  // going back - rewind selections, uploads & template to the state they were at when user was on previous page
  if (nextPageOrder < currentPageOrder) {
    stateBranchHistory.forEach((history) => {
      const historyForThisStateBranch = history.getHistory(state);

      if (nextPageOrder === 0 && currentPageOrder === pageOrder.length - 1) {
        actions.push(history.jumpToPast(0), history.clearHistory());
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
  validate: (
    { dialog, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const state = getState();
    const currentPage = getPage(state);
    const nextPage = findNextPage(currentPage, -1);

    if (nextPage) {
      dialog.showMessageBox(
        {
          buttons: ["Cancel", "Yes"],
          cancelId: 0,
          defaultId: 1,
          message: "Changes will be lost if you go back. Are you sure?",
          title: "Warning",
          type: "warning",
        },
        (buttonIndex: number) => {
          // index of button clicked
          if (buttonIndex === 1) {
            next(selectPage(currentPage, nextPage));
          } else {
            reject({ type: "ignore" });
          }
        }
      );
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

const saveUploadDraftToLocalStorage = (
  storage: LocalStorage,
  draftName: string,
  draftKey: string,
  state: State
): CurrentUpload => {
  const now = new Date();
  const metadata: CurrentUpload = {
    created: now,
    modified: now,
    name: draftName,
  };
  const draft = storage.get(draftKey);
  if (draft) {
    metadata.created = draft.metadata.created;
  }

  storage.set(draftKey, { metadata, state });

  return metadata;
};

const closeUploadTabLogic = createLogic({
  type: CLOSE_UPLOAD_TAB,
  validate: (
    {
      action,
      dialog,
      getApplicationMenu,
      getState,
      logger,
      storage,
    }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const currentPage = getPage(getState());
    const selectPageAction: SelectPageAction = selectPage(
      currentPage,
      Page.UploadSummary
    );
    const nextAction = {
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
    };

    const draftName: string | undefined = getCurrentUploadName(getState());
    const draftKey: string | undefined = getCurrentUploadKey(getState());
    // automatically save if user has chosen to save this draft
    if (draftName && draftKey) {
      saveUploadDraftToLocalStorage(storage, draftName, draftKey, getState());
      next(nextAction);
    } else if (getCanSaveUploadDraft(getState())) {
      dialog.showMessageBox(
        {
          buttons: ["Cancel", "Discard", "Save Upload Draft"],
          cancelId: 0,
          defaultId: 2,
          message: "Your draft will be discarded unless you save it.",
          title: "Warning",
          type: "question",
        },
        (buttonIndex: number) => {
          if (buttonIndex === 1) {
            // Discard Draft
            next(nextAction);
          } else if (buttonIndex === 2) {
            // Save Upload Draft
            next(
              batchActions([
                openModal("saveUploadDraft"),
                // close tab after Saving
                setDeferredAction(nextAction),
              ])
            );
          } else {
            // Cancel
            reject(clearUploadDraft());
          }
        }
      );
    } else {
      next(nextAction);
    }
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
      const well: string | number | undefined = curr.Well;
      const wellIds: number[] = well
        ? castArray(well).map((w: string | number) => parseInt(`${w}`, 10))
        : [];
      const workflows = curr.Workflow;
      const notes = curr.Notes;
      const channel =
        curr.channel && curr.channelId
          ? { name: curr.channel, channelId: curr.channelId }
          : undefined;
      return {
        ...accum,
        [key]: {
          ...curr,
          barcode: curr.barcode ? `${curr.barcode}` : undefined,
          channel,
          file,
          notes,
          wellIds,
          workflows,
        },
      };
    },
    {} as UploadStateBranch
  );
};

const openEditFileMetadataTabLogic = createLogic({
  process: async (
    {
      action,
      ctx,
      fms,
      getState,
      labkeyClient,
      logger,
      mmsClient,
    }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    // First we need to make sure the upload tab is open. If it is, we need to allow
    // the user to save their upload before continuing
    const state = getState();
    const currentUploadName = getCurrentUploadName(state);
    let modalToOpen: ModalName | undefined;
    if (currentUploadName) {
      modalToOpen = "saveExistingUploadDraft";
    } else if (getCanSaveUploadDraft(state)) {
      modalToOpen = "saveUploadDraft";
    } else {
      dispatch(
        batchActions([
          selectPage(getPage(state), Page.AddCustomData),
          selectView(Page.AddCustomData),
        ])
      );
    }

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
      dispatch(
        batchActions([
          removeRequestFromInProgress(
            AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
          ),
          setUploadError(action.payload.jobId, error),
        ])
      );
      done();
      return;
    }

    const actions: AnyAction[] = [];
    actions.push(receiveFileMetadata(fileMetadataForJob));

    // if we have a well, we can get the barcode and other plate info. This will be necessary
    // to display the well editor
    const wellAnnotationName = getWellAnnotation(getState())?.name || "Well";
    let wellIds: any = fileMetadataForJob[0][wellAnnotationName];
    if (wellIds) {
      wellIds = castArray(wellIds).map((w: string | number) =>
        parseInt(w + "", 10)
      );
      // assume all wells have same barcode
      const wellId = wellIds[0];
      try {
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
      } catch (e) {
        const error = `Could not get plate information from upload: ${e.message}`;
        logger.error(error);
        dispatch(
          batchActions([
            removeRequestFromInProgress(
              AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
            ),
            setUploadError(action.payload.jobId, error),
          ])
        );
        done();
        return;
      }
    } else {
      actions.push(associateByWorkflow(true));
    }

    // Currently we only allow applying one template at a time
    if (fileMetadataForJob[0]?.templateId) {
      const setAppliedTemplateAction = await getSetAppliedTemplateAction(
        fileMetadataForJob[0]?.templateId,
        getState,
        mmsClient,
        dispatch
      );
      actions.push(setAppliedTemplateAction);
    }

    const newUpload = convertImageModelMetadataToUploadStateBranch(
      fileMetadataForJob
    );

    if (modalToOpen) {
      actions.push(
        openModal(modalToOpen),
        setDeferredAction(
          batchActions([
            selectPage(getPage(state), Page.AddCustomData),
            selectView(Page.AddCustomData),
          ])
        )
      );
    } else {
      actions.push(updateUploads(newUpload, true));
    }

    dispatch(batchActions(actions));
    done();
  },
  type: OPEN_EDIT_FILE_METADATA_TAB,
  validate: (
    { action, ctx, logger }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
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
