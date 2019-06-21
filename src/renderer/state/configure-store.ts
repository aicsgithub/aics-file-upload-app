import { FileManagementSystem } from "@aics/aicsfiles";
import axios from "axios";
import { ipcRenderer, remote } from "electron";
import Store from "electron-store";
import {
    applyMiddleware,
    combineReducers,
    createStore,
} from "redux";
import { createLogicMiddleware } from "redux-logic";

import {
    enableBatching,
    feedback,
    job,
    metadata,
    selection,
    setting,
    upload,
} from "./";
import { State } from "./types";

import { LIMS_HOST, LIMS_PORT } from "../../shared/constants";

const storage = new Store();

const reducers = {
    feedback: feedback.reducer,
    job: job.reducer,
    metadata: metadata.reducer,
    selection: selection.reducer,
    setting: setting.reducer,
    upload: upload.reducer,
};

const logics = [
    ...feedback.logics,
    ...job.logics,
    ...metadata.logics,
    ...selection.logics,
    ...setting.logics,
    ...upload.logics,
];

export const reduxLogicDependencies = {
    dialog: remote.dialog,
    fms: new FileManagementSystem({host: LIMS_HOST, port: LIMS_PORT}),
    httpClient: axios,
    ipcRenderer,
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
