import electron, { dialog, Menu, shell } from "electron";
import * as storage from "electron-json-storage";
import BrowserWindow = Electron.BrowserWindow;
import MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;
import WebContents = Electron.WebContents;

const separatorOption: MenuItemConstructorOptions = { type: "separator" };
const app = electron.app;
const isMac = process.platform === "darwin";

export const setMenu = (webContents: WebContents) => {
    const template = [
        ...(isMac ? [{
            label: app.getName(),
            submenu: [
                { role: "about" },
                separatorOption,
                { role: "services" },
                separatorOption,
                { role: "hide" },
                { role: "hideothers" },
                { role: "unhide" },
                separatorOption,
                { role: "quit" },
            ],
        }] : []),
        {
            label: "File",
            submenu: [
                {
                    click: () => {
                        dialog.showMessageBox({
                            buttons: ["Cancel", "Staging", "Production"],
                            cancelId: 0,
                            message: "Switch environment?",
                            type: "question",

                        }, (response: number) => {
                            if (response > 0) {
                                const urlMap: {[index: number]: string} = {
                                    1: "stg-aics.corp.alleninstitute.org",
                                    2: "aics.corp.alleninstitute.org",
                                };
                                storage.set(
                                    "user-settings",
                                    {limsHost: urlMap[response]},
                                    {dataPath: "/tmp/file-upload"},
                                    (err: any) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                    });
                                webContents.send("SET_LIMS_URL", urlMap[response]);
                            }

                        });
                    },
                    label: "Switch environment",
                },
                isMac ? { role: "close" } : { role: "quit" },
            ],
        },
        {
            label: "Edit",
            submenu: [
                // TODO: disable and enable depending on redux history
                // {
                //     role: "undo",
                // },
                // {
                //     role: "redo",
                // },
                // separatorOption,
                {
                    role: "cut",
                },
                {
                    role: "copy",
                },
                {
                    role: "paste",
                },
            ],
        },
        {
            label: "View",
            submenu: [
                {
                    accelerator: "CmdOrCtrl+R",
                    click: (item: any, focusedWindow: BrowserWindow) => {
                        if (focusedWindow) {
                            focusedWindow.reload();
                        }
                    },
                    label: "Reload",
                },
                {
                    accelerator: process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
                    click: (item: any, focusedWindow: BrowserWindow) => {
                        if (focusedWindow) {
                            focusedWindow.webContents.toggleDevTools();
                        }
                    },
                    label: "Toggle Developer Tools",
                },
                separatorOption,
                {
                    role: "togglefullscreen",
                },
            ],
        },
        {
            role: "window",
            submenu: [
                {
                    role: "minimize",
                },
                {
                    role: "close",
                },
            ],
        },
        {
            role: "help",
            submenu: [
                {
                    click: () => {
                        shell.openExternal("http://confluence.corp.alleninstitute.org/display/SF/File+Upload+App");
                    },
                    label: "Learn More",
                },
            ],
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};
