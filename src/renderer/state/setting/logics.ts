import { map, uniq } from "lodash";
import { createLogic } from "redux-logic";

import { USER_SETTINGS_KEY } from "../../../shared/constants";
import { setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";
import { retrieveJobs } from "../job/actions";
import { requestMetadata } from "../metadata/actions";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicRejectCb,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { updateSettings } from "./actions";
import { ADD_TEMPLATE_ID_TO_SETTINGS, GATHER_SETTINGS, UPDATE_SETTINGS } from "./constants";
import { getLimsHost, getLimsPort, getTemplateIds } from "./selectors";

const updateSettingsLogic = createLogic({
    process: ({ctx, fms, getState, jssClient, labkeyClient, mmsClient}: ReduxLogicProcessDependencies,
              dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const state = getState();
        const host = getLimsHost(state);
        const port = getLimsPort(state);

        if (ctx.host !== host || ctx.port !== port) {
            fms.host = host;
            jssClient.host = host;
            labkeyClient.host = host;
            mmsClient.host = host;

            fms.port = port;
            jssClient.port = port;
            labkeyClient.port = port;
            mmsClient.port = port;

            dispatch(requestMetadata());
            dispatch(retrieveJobs());
        }

        done();
    },
    transform: ({action, ctx, getState, storage}: ReduxLogicTransformDependencies,
                next: ReduxLogicNextCb, reject: ReduxLogicRejectCb) => {
        try {
            // payload is a partial of the Setting State branch so it could be undefined.
            if (action.payload) {
                ctx.host = getLimsHost(getState());
                ctx.port = getLimsPort(getState());

                map(action.payload, (value: any, key: string) => {
                    storage.set(`${USER_SETTINGS_KEY}.${key}`, value);
                });
                next(action);
            } else {
                reject();
            }
        } catch (e) {
            next(batchActions([
                action,
                setAlert({
                    message: "Failed to persist settings",
                    type: AlertType.WARN,
                }),
            ]));
        }
    },
    type: UPDATE_SETTINGS,
});

const gatherSettingsLogic = createLogic({
    transform: ({ storage }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const settings = storage.get(USER_SETTINGS_KEY);
            next(updateSettings(settings));

        } catch (e) {
            next(setAlert({
                message: "Failed to get saved settings. Falling back to default settings.",
                type: AlertType.WARN,
            }));
        }

    },
    type: GATHER_SETTINGS,
});

const addTemplateIdToSettingsLogic = createLogic({
    transform: ({action, getState, storage}: ReduxLogicTransformDependencies,
                next: ReduxLogicNextCb) => {
        const templateIds = getTemplateIds(getState());
        next(updateSettings({templateIds: uniq([...templateIds, action.payload])}));
    },
    type: ADD_TEMPLATE_ID_TO_SETTINGS,
});

export default [
    addTemplateIdToSettingsLogic,
    gatherSettingsLogic,
    updateSettingsLogic,
];
