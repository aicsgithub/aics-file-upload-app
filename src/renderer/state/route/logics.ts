import * as Logger from "js-logger";
import { isEmpty, isNil } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { updatePageHistory } from "../metadata/actions";
import { getSelectionHistory, getTemplateHistory, getUploadHistory } from "../metadata/selectors";
import { clearSelectionHistory, jumpToPastSelection } from "../selection/actions";
import { getCurrentSelectionIndex } from "../selection/selectors";
import { clearTemplateHistory, jumpToPastTemplate } from "../template/actions";
import { getCurrentTemplateIndex } from "../template/selectors";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { clearUploadHistory, jumpToPastUpload } from "../upload/actions";
import { getCurrentUploadIndex } from "../upload/selectors";
import { batchActions } from "../util";

import { selectPage } from "./actions";
import { getNextPage, GO_BACK, GO_FORWARD, pageOrder, SELECT_PAGE } from "./constants";
import { getPage } from "./selectors";
import { Page } from "./types";
import Menu = Electron.Menu;

import MenuItem = Electron.MenuItem;

interface MenuItemWithSubMenu extends MenuItem {
    submenu?: Menu;
}

const pagesToAllowSwitchingEnvironments = [Page.AddCustomData, Page.DragAndDrop];
const updateAppMenu = (nextPage: Page, menu: Menu | null) => {
    if (menu) {
        // have to cast here because Electron's typings for MenuItem is incomplete
        const fileMenu: MenuItemWithSubMenu = menu.items
            .find((menuItem: MenuItem) => menuItem.label.toLowerCase() === "file") as MenuItemWithSubMenu;
        if (fileMenu.submenu) {
            const switchEnvironmentMenuItem = fileMenu.submenu.items
                .find((menuItem: MenuItem) => menuItem.label.toLowerCase() === "switch environment");
            if (switchEnvironmentMenuItem) {
                switchEnvironmentMenuItem.enabled = pagesToAllowSwitchingEnvironments.includes(nextPage);
            } else {
                Logger.error("Could not update application menu");
            }
        } else {
            Logger.error("Could not update application menu");
        }
    } else {
        Logger.error("Could not update application menu");
    }
};

const selectPageLogic = createLogic({
    process: (
        {action, getState, remote}: ReduxLogicProcessDependencies,
        dispatch: ReduxLogicNextCb,
        done: ReduxLogicDoneCb
    ) => {
        const {currentPage, nextPage} = action.payload;
        const state = getState();

        const nextPageOrder: number = pageOrder.indexOf(nextPage);
        const currentPageOrder: number = pageOrder.indexOf(currentPage);

        updateAppMenu(nextPage, remote.Menu.getApplicationMenu());

        // going back - rewind selections, uploads & template to the state they were at when user was on previous page
        if (nextPageOrder < currentPageOrder) {
            const actions: AnyAction[] = [action];

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

            stateBranchHistory.forEach((history) => {
                const historyForThisStateBranch = history.getHistory(state);

                if (nextPageOrder === 0 && currentPageOrder === pageOrder.length - 1) {
                    actions.push(
                        history.jumpToPast(0),
                        history.clearHistory()
                    );
                } else if (historyForThisStateBranch && !isNil(historyForThisStateBranch[nextPage])) {
                    const index = historyForThisStateBranch[nextPage];
                    actions.push(history.jumpToPast(index));
                }
            });

            if (!isEmpty(actions)) {
                dispatch(batchActions(actions));
            }

        // going forward - store current selection/upload indexes so we can rewind to this state if user goes back
        } else if (nextPageOrder > currentPageOrder) {
            const selectionIndex = getCurrentSelectionIndex(state);
            const uploadIndex = getCurrentUploadIndex(state);
            const templateIndex = getCurrentTemplateIndex(state);
            dispatch(updatePageHistory(currentPage, selectionIndex, uploadIndex, templateIndex));
        }

        done();
    },
    type: SELECT_PAGE,
});

const goBackLogic = createLogic({
    transform: ({getState, action, remote}: ReduxLogicTransformDependencies,
                next: ReduxLogicNextCb, reject: () => void) => {
        const state = getState();
        const currentPage = getPage(state);
        const nextPage = getNextPage(currentPage, -1);

        if (nextPage) {
            remote.dialog.showMessageBox({
                buttons: ["Cancel", "Yes"],
                cancelId: 0,
                defaultId: 1,
                message: "Changes will be lost if you go back. Are you sure?",
                title: "Warning",
                type: "warning",
            }, (response: number) => {
                if (response === 1) {
                    next(selectPage(currentPage, nextPage));
                } else {
                   reject();
                }
            });
        } else {
            reject();
        }
    },
    type: GO_BACK,
});

const goForwardLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb, reject: () => void) => {
        const currentPage = getPage(getState());
        const nextPage = getNextPage(currentPage, 1);

        if (nextPage) {
            next(selectPage(currentPage, nextPage));
        } else {
           reject();
        }
    },
    type: GO_FORWARD,
});

export default [
    goBackLogic,
    goForwardLogic,
    selectPageLogic,
];
