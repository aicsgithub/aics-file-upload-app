import axios from "axios";
import { remote } from "electron";
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
    httpClient: axios,
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
