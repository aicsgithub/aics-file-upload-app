import { createLogic } from "redux-logic";

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
    { getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const deferredAction = getDeferredAction(getState());
    if (deferredAction) {
      dispatch(deferredAction);
    }
    dispatch(clearDeferredAction());
    done();
  },
  type: CLOSE_MODAL,
});

export default [closeModalLogic];
