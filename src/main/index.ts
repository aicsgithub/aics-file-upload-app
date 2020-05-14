import { app, BrowserWindow, Event, ipcMain } from "electron";
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import { format as formatUrl } from "url";

import {
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
  window.maximize();

  // webContents allow us to send events to the renderer process
  const { webContents } = window;
  setMenu(webContents);

  if (isDevelopment) {
    installExtension(REACT_DEVELOPER_TOOLS);
    window.webContents.openDevTools();
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
  } else {
    window.loadURL(
      formatUrl({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file",
        slashes: true,
      })
    );
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
app.on("ready", () => {
  mainWindow = createMainWindow();
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on(
  OPEN_CREATE_PLATE_STANDALONE,
  (
    event: any,
    limsHost: string,
    limsPort: string,
    barcode: string,
    prefix: string
  ) => {
    const child: BrowserWindow = new BrowserWindow({
      parent: mainWindow,
      show: false,
      webPreferences: {
        nodeIntegration: false,
      },
    });
    const plateView = `/labkey/aics_microscopy/AICS/plateStandalone.view?Barcode=${barcode}`;
    // We can't modify the environment variables this would normally get the host and port from because it is in a
    // different process, similarly we are unable to access the state to get the most current so we need to rely on
    // being given them
    let modalUrl = `${LIMS_PROTOCOL}://${limsHost}:${limsPort}${plateView}`;
    if (prefix === "AX" || prefix === "AD") {
      modalUrl = `${modalUrl}&TeamMode=AssayDev`;
    }
    child.loadURL(modalUrl);
    child.once("ready-to-show", () => {
      child.show();
    });
    child.webContents.on("will-navigate", (e: Event, next: string) => {
      if (!next.includes("plateStandalone.view")) {
        e.preventDefault();
        const childURL = new URL(child.webContents.getURL());
        const imagingSessionId = new URLSearchParams(childURL.search).get(
          "ImagingSessionId"
        );
        event.sender.send(PLATE_CREATED, barcode, imagingSessionId);
        child.close();
      }
    });
  }
);
