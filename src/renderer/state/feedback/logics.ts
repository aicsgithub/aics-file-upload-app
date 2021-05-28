import { createLogic } from "redux-logic";

import { clearTemplateDraft } from "../template/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
} from "../types";

import { clearDeferredAction, setErrorAlert, setInfoAlert } from "./actions";
import { CHECK_FOR_UPDATE, CLOSE_MODAL } from "./constants";
import { getDeferredAction } from "./selectors";

const checkForUpdateLogic = createLogic({
  process: async (
    { applicationInfoService }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    try {
      const updateInfo = await applicationInfoService.checkForUpdate();
      if (updateInfo) {
        dispatch(
          setInfoAlert(
            `Update available! Update from ${updateInfo.currentVersion} to ${updateInfo.newestVersion} by downloading the newest version from our Confluence page`
          )
        );
      }
    } catch (error) {
      dispatch(setErrorAlert(`Unable to check for updates: ${error.message}`));
    }
    done();
  },
  type: CHECK_FOR_UPDATE,
});

const closeModalLogic = createLogic({
  process: (
    { action, getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const deferredAction = getDeferredAction(getState());
    if (deferredAction) {
      dispatch(deferredAction);
    }
    dispatch(clearDeferredAction());
    if (action.payload === "templateEditor") {
      // Clear template draft any time the draft editor is closed
      dispatch(clearTemplateDraft());
    }
    done();
  },
  type: CLOSE_MODAL,
});

export default [checkForUpdateLogic, closeModalLogic];
