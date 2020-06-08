import { existsSync } from "fs";
import { platform } from "os";

import { Menu, MenuItem } from "electron";
import { isEmpty, isNil } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import {
  ensureDraftGetsSaved,
  makePosixPathCompatibleWithPlatform,
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
} from "../metadata/selectors";
import {
  clearSelectionHistory,
  jumpToPastSelection,
} from "../selection/actions";
import { getCurrentSelectionIndex } from "../selection/selectors";
import { getMountPoint } from "../setting/selectors";
import { clearTemplateHistory, jumpToPastTemplate } from "../template/actions";
import { getCurrentTemplateIndex } from "../template/selectors";
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
} from "../upload/actions";
import { getUploadRowKey } from "../upload/constants";
import { getCurrentUploadIndex, getUploadFiles } from "../upload/selectors";
import { batchActions } from "../util";

import { closeUploadTab, selectPage } from "./actions";
import {
  CLOSE_UPLOAD_TAB,
  findNextPage,
  GO_BACK,
  GO_FORWARD,
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

export default [
  closeUploadTabLogic,
  goBackLogic,
  goForwardLogic,
  selectPageLogic,
];
