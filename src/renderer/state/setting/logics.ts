import * as storage from "electron-json-storage";
import { createLogic } from "redux-logic";
import { USER_SETTING_STORAGE_FILE_NAME } from "../../../shared/constants";
import { setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";
import { ReduxLogicNextCb, ReduxLogicTransformDependencies } from "../types";
import { batchActions } from "../util";
import { updateSettings } from "./actions";
import { GATHER_SETTINGS, UPDATE_SETTINGS } from "./constants";

const updateSettingsLogic = createLogic({
    transform: ({action}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        storage.set(
            USER_SETTING_STORAGE_FILE_NAME,
            action.payload,
            (err: any) => {
                if (err) {
                    next(batchActions([
                        action,
                        setAlert({
                            message: "Failed to persist settings",
                            type: AlertType.WARN,
                        }),
                    ]));
                }
            });
        next(action);
    },
    type: UPDATE_SETTINGS,
});

const gatherSettingsLogic = createLogic({
   transform: (deps: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
       storage.get(
           USER_SETTING_STORAGE_FILE_NAME,
           (error: any, settings: object) => {
               if (error) {
                   next(setAlert({
                       message: "Failed to get saved settings. Falling back to default settings.",
                       type: AlertType.WARN,
                   }));
               } else {
                   next(updateSettings(settings));
               }
           }
       );
   },
   type: GATHER_SETTINGS,
});

export default [
    gatherSettingsLogic,
    updateSettingsLogic,
];
