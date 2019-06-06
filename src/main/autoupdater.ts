import electron from "electron";
import { autoUpdater } from "electron-updater";
import Logger from "js-logger";

import { AlertType } from "../renderer/state/feedback/types";
import { ADD_EVENT_FROM_MAIN } from "../shared/constants";
import WebContents = electron.WebContents;

const sendStatusToWindow = (webContents: WebContents, message: string, type: AlertType = AlertType.INFO) => {
    webContents.send(ADD_EVENT_FROM_MAIN, message, type);
};

export const registerAutoUpdaterEvents = (webContents: WebContents) => {
    Logger.useDefaults();
    autoUpdater.logger = Logger;
    autoUpdater.on("checking-for-update", () => {
        sendStatusToWindow(webContents, "Checking for update...");
    });
    autoUpdater.on("update-available", (info) => {
        Logger.info("update-available", info);
        sendStatusToWindow(webContents, "Update available.");
    });
    autoUpdater.on("update-not-available", () => {
        sendStatusToWindow(webContents, "Latest version already installed!");
    });
    autoUpdater.on("error", (err) => {
        sendStatusToWindow(webContents, "Error in auto-updater. " + err);
    });
    autoUpdater.on("download-progress", (progressObj) => {
        let logMessage = "Download speed: " + progressObj.bytesPerSecond;
        logMessage = logMessage + " - Downloaded " + progressObj.percent + "%";
        logMessage = logMessage + " (" + progressObj.transferred + "/" + progressObj.total + ")";
        sendStatusToWindow(webContents, logMessage);
    });
    autoUpdater.on("update-downloaded", (info) => {
        Logger.info("update-downloaded", info);
        sendStatusToWindow(webContents, "Update downloaded");
    });
};
