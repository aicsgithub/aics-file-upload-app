import { createLogic } from "redux-logic";
import { OPEN_TEMPLATE_EDITOR } from "../../../shared/constants";
import { clearTemplateDraft, getTemplate } from "../template/actions";

import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
} from "../types";

import { clearDeferredAction, setDeferredAction } from "./actions";
import { CLOSE_MODAL } from "./constants";
import { getDeferredAction } from "./selectors";

const openTemplateEditorLogic = createLogic({
    process: ({action}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        dispatch(setDeferredAction(clearTemplateDraft()));
        if (action.payload) {
            dispatch(getTemplate(action.payload));
        }

        done();
    },
    type: OPEN_TEMPLATE_EDITOR,
});

const closeModalLogic = createLogic({
    process: ({ getState }: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const deferredAction = getDeferredAction(getState());
        if (deferredAction) {
            dispatch(deferredAction);
        }
        dispatch(clearDeferredAction());
        done();
    },
    type: CLOSE_MODAL,
});

export default [
    closeModalLogic,
    openTemplateEditorLogic,
];
