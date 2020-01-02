import { createLogic } from "redux-logic";

import {
    HTTP_STATUS,
    ReduxLogicNextCb,
    ReduxLogicTransformDependencies
} from "../types";
import { batchActions } from "../util";
import { addEvent } from "./actions";

import { CLEAR_ALERT, SET_ALERT } from "./constants";
import { getAlert } from "./selectors";

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

export default [
    clearAlertLogic,
    setAlertLogic,
];
