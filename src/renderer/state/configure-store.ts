import { FileManagementSystem } from "@aics/aicsfiles";
import { JobStatusClient } from "@aics/job-status-client";
import { ipcRenderer, remote } from "electron";
import Store from "electron-store";
import * as Logger from "js-logger";
import { userInfo } from "os";
import {
    applyMiddleware,
    combineReducers,
    createStore,
} from "redux";
import { createLogicMiddleware } from "redux-logic";
import LabkeyClient from "../util/labkey-client";
import MMSClient from "../util/mms-client";

import {
    enableBatching,
    feedback,
    job,
    metadata,
    route,
    selection,
    setting,
    template,
    upload,
} from "./";
import { State } from "./types";

import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../shared/constants";

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

export default function createReduxStore(initialState?: State) {
    const logicMiddleware = createLogicMiddleware(logics, reduxLogicDependencies);
    const middleware = applyMiddleware(logicMiddleware);
    const rootReducer = enableBatching<State>(combineReducers(reducers));

    if (initialState) {
        return createStore(rootReducer, initialState, middleware);
    }

    return createStore(rootReducer, middleware);
}
