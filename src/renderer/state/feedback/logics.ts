import { createLogic } from "redux-logic";
import { OPEN_TEMPLATE_EDITOR } from "../../../shared/constants";
import { clearTemplateDraft, getTemplate } from "../template/actions";

import {
    HTTP_STATUS, ReduxLogicDoneCb,
    ReduxLogicNextCb, ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { addEvent } from "./actions";

import { CLEAR_ALERT, CLOSE_MODAL, SET_ALERT } from "./constants";
import { getAlert, getDeferredAction } from "./selectors";

export const httpStatusToMessage: Map<number, string> = new Map([
    [HTTP_STATUS.INTERNAL_SERVER_ERROR, "Unknown error from server"],
    [HTTP_STATUS.BAD_GATEWAY, "Bad Gateway Error: Labkey or MMS is down."],
]);

const setAlertLogic = createLogic({
    transform: ({ action }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const { payload } = action;
        const updatedPayload = { ...payload };

        if (httpStatusToMessage.has(payload.statusCode) && !payload.message) {
            updatedPayload.message = httpStatusToMessage.get(payload.statusCode);
        }

        next({
            ...action,
            payload: updatedPayload,
        });
    },
    type: SET_ALERT,
});

const clearAlertLogic = createLogic({
    transform: ({ action, getState }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const alert = getAlert(getState());
        if (alert && alert.message) {
            next(batchActions([
                addEvent(alert.message, alert.type, new Date()),
                action,
            ]));
        }
    },
    type: CLEAR_ALERT,
});

const openTemplateEditorLogic = createLogic({
    process: ({action}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        if (action.payload) {
            dispatch(getTemplate(action.payload));
        }

        done();
    },
    type: OPEN_TEMPLATE_EDITOR,
});

const closeModalLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const deferredAction = getDeferredAction(getState());
        if (action.payload === "templateEditor") {
            next(batchActions([
                clearTemplateDraft(),
                action,
            ]));
        } else if (deferredAction) {
            next(batchActions([deferredAction, action]));
        } else {
            next(action);
        }
    },
    type: CLOSE_MODAL,
});

export default [
    clearAlertLogic,
    closeModalLogic,
    openTemplateEditorLogic,
    setAlertLogic,
];
