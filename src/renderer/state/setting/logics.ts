import { basename } from "path";

import { map } from "lodash";
import { createLogic } from "redux-logic";

import {
  PREFERRED_TEMPLATE_ID,
  SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED,
  USER_SETTINGS_KEY,
} from "../../../shared/constants";
import { LimsUrl } from "../../../shared/types";
import { closeSetMountPointNotification, setAlert } from "../feedback/actions";
import { getSetMountPointNotificationVisible } from "../feedback/selectors";
import { handleAbandonedJobs, retrieveJobs } from "../job/actions";
import { requestMetadata } from "../metadata/actions";
import {
  AlertType,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";

import { updateSettings } from "./actions";
import { GATHER_SETTINGS, SET_MOUNT_POINT, UPDATE_SETTINGS } from "./constants";
import {
  getLimsHost,
  getLimsPort,
  getLoggedInUser,
  getMountPoint,
} from "./selectors";

export const updateSettingsLogic = createLogic({
  process: async (
    {
      ctx,
      fms,
      getState,
      jssClient,
      labkeyClient,
      mmsClient,
    }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const state = getState();
    const host = getLimsHost(state);
    const port = getLimsPort(state);
    const username = getLoggedInUser(state);
    const mountPoint = getMountPoint(state);

    if (ctx.host !== host || ctx.port !== port || ctx.username !== username) {
      fms.host = host;
      jssClient.host = host;
      labkeyClient.host = host;
      mmsClient.host = host;

      fms.port = port;
      jssClient.port = port;
      labkeyClient.port = port;
      mmsClient.port = port;

      fms.username = username;
      jssClient.username = username;
      mmsClient.username = username;

      dispatch(requestMetadata());
      dispatch(handleAbandonedJobs());
      dispatch(retrieveJobs());
    }

    if (mountPoint && mountPoint !== ctx.mountPoint) {
      try {
        await fms.setMountPoint(mountPoint);
        dispatch(
          setAlert({
            message: "Mount point successfully set and saved to your settings",
            type: AlertType.SUCCESS,
          })
        );
      } catch (e) {
        dispatch(
          setAlert({
            message: e.message || "Could not set mount point",
            type: AlertType.ERROR,
          })
        );
      }
    }

    done();
  },
  type: UPDATE_SETTINGS,
  validate: (
    { action, ctx, getState, storage }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    try {
      // payload is a partial of the Setting State branch so it could be undefined.
      if (action.payload) {
        ctx.host = getLimsHost(getState());
        ctx.port = getLimsPort(getState());
        ctx.mountPoint = getMountPoint(getState());
        ctx.username = getLoggedInUser(getState());

        map(action.payload, (value: any, key: string) => {
          storage.set(`${USER_SETTINGS_KEY}.${key}`, value);
        });
        next(action);
      } else {
        reject({ type: "ignore" });
      }
    } catch (e) {
      next(
        batchActions([
          action,
          setAlert({
            message: "Failed to persist settings",
            type: AlertType.WARN,
          }),
        ])
      );
    }
  },
});

const gatherSettingsLogic = createLogic({
  validate: (
    {
      action,
      fms,
      jssClient,
      labkeyClient,
      logger,
      mmsClient,
      storage,
    }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    try {
      // Anything in the userSettings object is considered environment-independent, meaning that
      // no matter what LIMS environment we're using or which user is "logged-in", these settings still apply.
      const userSettings = storage.get(USER_SETTINGS_KEY);
      if (!userSettings) {
        reject({ type: "ignore" });
        logger.debug("no user settings found");
        return;
      }

      const { limsHost, limsPort, username } = userSettings;
      // Template ID is environment-dependent (staging and production could have different sets of template ids)
      // so we need to get it from another place and add it manually.
      userSettings.templateId = storage.get(PREFERRED_TEMPLATE_ID);
      if (limsHost) {
        fms.host = limsHost;
        jssClient.host = limsHost;
        labkeyClient.host = limsHost;
        mmsClient.host = limsHost;
      }

      if (limsPort) {
        fms.port = limsPort;
        jssClient.port = limsPort;
        labkeyClient.port = limsPort;
        mmsClient.port = limsPort;
      }

      if (username) {
        fms.username = username;
        jssClient.username = username;
        mmsClient.username = username;
      }

      next({
        ...action,
        payload: userSettings,
      });
    } catch (e) {
      next(
        setAlert({
          message:
            "Failed to get saved settings. Falling back to default settings.",
          type: AlertType.WARN,
        })
      );
    }
  },
  type: GATHER_SETTINGS,
});

const setMountPointLogic = createLogic({
  process: async (
    { dialog, getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    if (getSetMountPointNotificationVisible(getState())) {
      dispatch(closeSetMountPointNotification());
    }

    const { filePaths: folders } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Browse to the folder that is mounted to /allen/aics",
    });
    if (folders?.length) {
      const folder = basename(folders[0]);
      if (folder !== "aics") {
        dispatch(
          setAlert({
            message: 'Folder selected was not named "aics"',
            type: AlertType.ERROR,
          })
        );
      } else {
        dispatch(updateSettings({ mountPoint: folders[0] }));
        dispatch(
          setAlert({
            message: "Successfully set the allen mount point",
            type: AlertType.SUCCESS,
          })
        );
      }
    }
    done();
  },
  type: SET_MOUNT_POINT,
});

const switchEnvironmentLogic = createLogic({
  process: async (
    { dialog }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { response: buttonIndex } = await dialog.showMessageBox({
      buttons: ["Cancel", "Local", "Staging", "Production"],
      cancelId: 0,
      message: "Switch environment?",
      type: "question",
    });
    if (buttonIndex > 0) {
      const urlMap: { [index: number]: LimsUrl } = {
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
      dispatch(updateSettings(urlMap[buttonIndex]));
    }
    done();
  },
  type: SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED,
});

export default [
  gatherSettingsLogic,
  setMountPointLogic,
  switchEnvironmentLogic,
  updateSettingsLogic,
];
