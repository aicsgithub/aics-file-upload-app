import { basename } from "path";

import { find, map } from "lodash";
import { createLogic } from "redux-logic";

import {
  PREFERRED_TEMPLATE_ID,
  USER_SETTINGS_KEY,
} from "../../../shared/constants";
import { LimsUrl } from "../../../shared/types";
import { closeSetMountPointNotification, setAlert } from "../feedback/actions";
import { getSetMountPointNotificationVisible } from "../feedback/selectors";
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
import {
  GATHER_SETTINGS,
  OPEN_ENVIRONMENT_DIALOG,
  SET_MOUNT_POINT,
  UPDATE_SETTINGS,
} from "./constants";
import { getMountPoint } from "./selectors";

export const updateSettingsLogic = createLogic({
  process: (
    { ctx, getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const state = getState();
    const mountPoint = getMountPoint(state);

    if (mountPoint && mountPoint !== ctx.mountPoint) {
      dispatch(
        setAlert({
          message: "Mount point successfully set and saved to your settings",
          type: AlertType.SUCCESS,
        })
      );
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
        ctx.mountPoint = getMountPoint(getState());

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
  validate: async (
    { action, logger, labkeyClient, storage }: ReduxLogicTransformDependencies,
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

      // Template ID is environment-dependent (staging and production could have different sets of template ids)
      // so we need to get it from another place and add it manually.
      userSettings.templateId = storage.get(PREFERRED_TEMPLATE_ID);

      if (userSettings.templateId) {
        // Determine the most update to date template for the stored template ID
        const templates = await labkeyClient.getTemplates();
        const templateForStoredId = find(
          templates,
          (template) => userSettings.templateId === template["TemplateId"]
        );
        if (templateForStoredId) {
          let mostRecentlyCreatedTemplateForName = templateForStoredId;
          templates.forEach((template) => {
            if (
              template["Name"] === templateForStoredId["Name"] &&
              template["Version"] >
                mostRecentlyCreatedTemplateForName["Version"]
            ) {
              mostRecentlyCreatedTemplateForName = template;
            }
          });
          userSettings.templateId =
            mostRecentlyCreatedTemplateForName["TemplateId"];
        }
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
    if (folders?.length > 0) {
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

const openEnvironmentDialogLogic = createLogic({
  process: async (
    { dialog, storage, remote }: ReduxLogicProcessDependencies,
    dispatch,
    done
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
      const env = urlMap[buttonIndex];
      // Persist selected environment to user settings
      try {
        Object.entries(env).map(([key, value]) =>
          storage.set(`${USER_SETTINGS_KEY}.${key}`, value)
        );
      } catch (e) {
        dispatch(
          setAlert({
            message: "Failed to persist settings",
            type: AlertType.WARN,
          })
        );
      }
      // Reload the app with the newly selected environment
      remote.getCurrentWindow().reload();
    }
    done();
  },
  type: OPEN_ENVIRONMENT_DIALOG,
});

export default [
  gatherSettingsLogic,
  setMountPointLogic,
  openEnvironmentDialogLogic,
  updateSettingsLogic,
];
