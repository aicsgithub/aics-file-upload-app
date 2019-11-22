import { notification } from "antd";
import { existsSync } from "fs";
import { map, uniq } from "lodash";
import { platform } from "os";
import { basename } from "path";
import { createLogic } from "redux-logic";

import { SWITCH_ENVIRONMENT, USER_SETTINGS_KEY } from "../../../shared/constants";
import { LimsUrl } from "../../../shared/types";
import { makePosixPathCompatibleWithPlatform } from "../../util";
import { setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";
import { retrieveJobs } from "../job/actions";
import { requestMetadata } from "../metadata/actions";
import {
    ElectronRemote,
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicRejectCb,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { updateSettings } from "./actions";
import {
    ADD_TEMPLATE_ID_TO_SETTINGS,
    GATHER_SETTINGS,
    SET_MOUNT_POINT,
    UPDATE_SETTINGS,
} from "./constants";
import { getLimsHost, getLimsPort, getMountPoint, getTemplateIds } from "./selectors";

const updateSettingsLogic = createLogic({
    process: async ({ctx, fms, getState, jssClient, labkeyClient, mmsClient}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const state = getState();
        const host = getLimsHost(state);
        const port = getLimsPort(state);
        const mountPoint = getMountPoint(state);

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

        if (mountPoint && mountPoint !== ctx.mountPoint) {
            try {
                await fms.setMountPoint(mountPoint);
                dispatch(setAlert({
                    message: "Mount point successfully set and saved to your settings",
                    type: AlertType.SUCCESS,
                }));
            } catch (e) {
                dispatch(setAlert({
                    message: e.message || "Could not set mount point",
                    type: AlertType.ERROR,
                }));
            }
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
                ctx.mountPoint = getMountPoint(getState());

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

const openSetMountPointNotification = (remote: ElectronRemote, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb,
                                       message?: string): void => {
    // todo check settings
    if (existsSync(makePosixPathCompatibleWithPlatform("/allen/aics", platform()))) { // todo use ! again
        notification.open({
            description:
                "Click this notification to manually set the allen mount point",
            duration: 0,
            message: message || "Could not find allen mount point (/allen/aics).",
            onClick: () => {
                notification.destroy();
                remote.dialog.showOpenDialog({
                    properties: ["openDirectory"],
                    title: "Browse to the folder that is mounted to /allen/aics",
                }, async (folders?: string[]) => {
                    if (folders && folders.length) {
                        const folder = basename(folders[0]);
                        if (folder !== "aics") {
                            openSetMountPointNotification(remote, dispatch, done,
                                "Folder selected was not named \"aics\"");
                        } else {
                            dispatch(updateSettings({mountPoint: folders[0]}));
                            dispatch(setAlert({
                                message: "Successfully set the allen mount point",
                                type: AlertType.SUCCESS,
                            }));
                            done();
                        }
                    }
                });
            },
        });
    }
};

const setMountPointLogic = createLogic({
    process: ({remote}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
              done: ReduxLogicDoneCb) => {
        openSetMountPointNotification(remote, dispatch, done);
    },
    type: SET_MOUNT_POINT,
});

const switchEnvironmentLogic = createLogic({
    process: ({remote}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        remote.dialog.showMessageBox({
            buttons: ["Cancel", "Local", "Staging", "Production"],
            cancelId: 0,
            message: "Switch environment?",
            type: "question",

        }, (response: number) => {
            if (response > 0) {
                const urlMap: {[index: number]: LimsUrl} = {
                    1: {
                        limsHost: "localhost",
                        limsPort: "8080",
                        limsProtocol: "http",
                    },
                    2: {
                        limsHost: "stg-aics.corp.alleninstitute.org",
                        limsPort: "80",
                        limsProtocol: "http",
                    },
                    3: {
                        limsHost: "aics.corp.alleninstitute.org",
                        limsPort: "80",
                        limsProtocol: "http",
                    },
                };
                dispatch(updateSettings(urlMap[response]));
            }
            done();
        });
    },
    type: SWITCH_ENVIRONMENT,
});

export default [
    addTemplateIdToSettingsLogic,
    gatherSettingsLogic,
    setMountPointLogic,
    switchEnvironmentLogic,
    updateSettingsLogic,
];
