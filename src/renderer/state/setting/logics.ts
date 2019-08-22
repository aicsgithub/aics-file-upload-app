import * as Logger from "js-logger";
import { map } from "lodash";
import { createLogic } from "redux-logic";

import { USER_SETTINGS_KEY } from "../../../shared/constants";
import { setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";
import { ReduxLogicNextCb, ReduxLogicRejectCb, ReduxLogicTransformDependencies } from "../types";
import { batchActions } from "../util";
import { updateSettings } from "./actions";
import { GATHER_SETTINGS, UPDATE_SETTINGS } from "./constants";

const updateSettingsLogic = createLogic({
    transform: ({action, storage}: ReduxLogicTransformDependencies,
                next: ReduxLogicNextCb, reject: ReduxLogicRejectCb) => {
        try {
            // payload is a partial of the Setting State branch so it could be undefined.
            if (action.payload) {
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
           Logger.info(storage.path);
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

export default [
    gatherSettingsLogic,
    updateSettingsLogic,
];
