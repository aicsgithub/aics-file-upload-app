import { app, BrowserWindow, Event, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import { format as formatUrl } from "url";

import {
    LIMS_HOST,
    LIMS_PORT,
    LIMS_PROTOCOL,
    OPEN_CREATE_PLATE_STANDALONE,
    PLATE_CREATED,
    SAFELY_CLOSE_WINDOW,
} from "../shared/constants";

import { setMenu } from "./menu";

const isDevelopment = process.env.NODE_ENV !== "production";

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow: BrowserWindow | undefined;

function createMainWindow() {
    const window = new BrowserWindow({
        height: 750,
        webPreferences: {
            nodeIntegration: true,
            // Disables same-origin policy and allows us to query Labkey
            webSecurity: false,
        },
        width: 1000,
    });

    // webContents allow us to send events to the renderer process
    const { webContents } = window;
    setMenu(webContents);

    if (isDevelopment) {
        window.webContents.openDevTools();
    }

    if (isDevelopment) {
        window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
    } else {
        window.loadURL(formatUrl({
            pathname: path.join(__dirname, "index.html"),
            protocol: "file",
            slashes: true,
        }));
    }

    window.on("close", (e: Event) => {
        e.preventDefault();
        window.webContents.send(SAFELY_CLOSE_WINDOW);
    });

    window.on("closed", () => {
        mainWindow = undefined;
    });

    window.webContents.on("devtools-opened", () => {
        window.focus();
        setImmediate(() => {
            window.focus();
        });
    });

    return window;
}

// quit application when all windows are closed
app.on("window-all-closed", () => {
    // on macOS it is common for applications to stay open until the user explicitly quits
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // on macOS it is common to re-create a window even after all windows have been closed
    if (mainWindow === null) {
        mainWindow = createMainWindow();
    }
});

// create main BrowserWindow when electron is ready
app.on("ready", async () => {
    mainWindow = createMainWindow();
    await autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on(OPEN_CREATE_PLATE_STANDALONE, (event: any, barcode: string, prefix: string) => {
    const child: BrowserWindow = new BrowserWindow({
        parent: mainWindow,
        show: false,
        webPreferences: {
            nodeIntegration: false,
        },
    });
    const plateView = `/labkey/aics_microscopy/AICS/plateStandalone.view?Barcode=${barcode}`;
    let modalUrl = `${LIMS_PROTOCOL}://${LIMS_HOST}:${LIMS_PORT}${plateView}`;
    if (prefix === "AX" || prefix === "AD") {
        modalUrl = `${modalUrl}&TeamMode=AssayDev`;
    }
    child.loadURL(modalUrl);
    child.once("ready-to-show", () => {
        child.show();
    });
    child.webContents.on("will-navigate", (e: Event, next: string) => {
        if (next.indexOf("plateStandalone.view") === -1) {
            e.preventDefault();
            const childURL = new URL(child.webContents.getURL());
            const imagingSessionId = new URLSearchParams(childURL.search).get("ImagingSessionId");
            event.sender.send(PLATE_CREATED, barcode, imagingSessionId);
            child.close();
        }
    });
});
