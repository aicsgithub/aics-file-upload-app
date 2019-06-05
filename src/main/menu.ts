import electron, { dialog, Menu, shell } from "electron";
import { SET_LIMS_URL } from "../shared/constants";
import { LimsUrl } from "../shared/types";
import BrowserWindow = Electron.BrowserWindow;
import MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;
import WebContents = Electron.WebContents;
import MenuItem = Electron.MenuItem;

const separatorOption: MenuItemConstructorOptions = { type: "separator" };
const app = electron.app;
const isMac = process.platform === "darwin";

/**
 * Create App Menu
 * @param webContents WebContents object from main BrowserWindow. Used for sending events to renderer process.
 */
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
                                const urlMap: {[index: number]: LimsUrl} = {
                                    1: {
                                        limsHost: "stg-aics.corp.alleninstitute.org",
                                        limsPort: "80",
                                        limsProtocol: "http",
                                    },
                                    2: {
                                        limsHost: "aics.corp.alleninstitute.org",
                                        limsPort: "80",
                                        limsProtocol: "http",
                                    },
                                };
                                webContents.send(SET_LIMS_URL, urlMap[response]);
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
                {
                    // tslint:disable-next-line
                    click: () => {},
                    label: "About " + app.getVersion(),
                },
            ],
        },
    ] as any as Array<(MenuItemConstructorOptions) | (MenuItem)>;
    // Casting is necessary to avoid having to cast each role value from string to a union string type
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};
