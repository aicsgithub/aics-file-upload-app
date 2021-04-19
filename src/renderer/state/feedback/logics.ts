import { createLogic } from "redux-logic";

import { clearTemplateDraft } from "../template/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
} from "../types";

import { clearDeferredAction } from "./actions";
import { CLOSE_MODAL } from "./constants";
import { getDeferredAction } from "./selectors";

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

export default [closeModalLogic];
