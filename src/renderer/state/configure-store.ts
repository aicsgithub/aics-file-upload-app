import { FileManagementSystem } from "@aics/aicsfiles";
import { JobStatusClient } from "@aics/job-status-client";
import { ipcRenderer, remote } from "electron";
import Store from "electron-store";
import * as Logger from "js-logger";
import moment from "moment";
import { userInfo } from "os";
import { AnyAction, applyMiddleware, combineReducers, createStore } from "redux";
import { createLogicMiddleware } from "redux-logic";

import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL, TEMP_UPLOAD_STORAGE_KEY } from "../../shared/constants";
import LabkeyClient from "../util/labkey-client";
import MMSClient from "../util/mms-client";

import { enableBatching, feedback, job, metadata, route, selection, setting, template, upload } from "./";
import { addEvent } from "./feedback/actions";
import { AlertType } from "./feedback/types";
import { State } from "./types";
import { batchActions } from "./util";

const storage = new Store();

const reducers = {
    feedback: feedback.reducer,
    job: job.reducer,
    metadata: metadata.reducer,
    route: route.reducer,
    selection: selection.reducer,
    setting: setting.reducer,
    template: template.reducer,
    upload: upload.reducer,
};

const logics = [
    ...feedback.logics,
    ...job.logics,
    ...metadata.logics,
    ...route.logics,
    ...selection.logics,
    ...setting.logics,
    ...template.logics,
    ...upload.logics,
];

export const reduxLogicDependencies = {
    dialog: remote.dialog,
    fms: new FileManagementSystem({host: LIMS_HOST, port: LIMS_PORT, logLevel: "trace"}),
    getApplicationMenu: remote.Menu.getApplicationMenu,
    ipcRenderer,
    jssClient: new JobStatusClient({
        host: LIMS_HOST,
        logLevel: "debug",
        port: LIMS_PORT,
        username: userInfo().username,
    }),
    labkeyClient: new LabkeyClient({
        host: LIMS_HOST,
        localStorage: storage,
        port: LIMS_PORT,
        protocol: LIMS_PROTOCOL,
    }),
    logger: Logger,
    mmsClient: new MMSClient({
        host: LIMS_HOST,
        localStorage: storage,
        port: LIMS_PORT,
        protocol: LIMS_PROTOCOL,
        username: userInfo().username,
    }),
    storage,
};

const autoSaver = (store: any) => (next: any) => (action: AnyAction) => {
    let result = next(action);
    if (action.autoSave) {
        const nextState = store.getState();
        storage.set(TEMP_UPLOAD_STORAGE_KEY, nextState);
        result = next(batchActions([
            action,
            addEvent(`Your draft was saved at ${moment().format("h:mm a")}`, AlertType.INFO, new Date()),
        ]));
    }

    // trim branches that we want to resaturate
    // add to local storage

    // on upload successful, clear
    // on failed upload, ??
    // if closing a tab, allow users to choose whether they would like to save their work and open again
    //      if yes - give users a way to name and keep in local storage
    //      if no - clear local storage
    // File > Open Upload: show modal with uploads in local storage
    return result;
}

export default function createReduxStore(initialState?: State) {
    const logicMiddleware = createLogicMiddleware(logics, reduxLogicDependencies);
    const middleware = applyMiddleware(logicMiddleware, autoSaver);
    const rootReducer = enableBatching<State>(combineReducers(reducers));

    if (initialState) {
        return createStore(rootReducer, initialState, middleware);
    }

    return createStore(rootReducer, middleware);
}
