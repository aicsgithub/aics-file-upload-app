import { FileManagementSystem } from "@aics/aicsfiles";
import { JobStatusClient } from "@aics/job-status-client";
import {
    applyMiddleware,
    combineReducers,
    createStore,
} from "redux";
import { createLogicMiddleware } from "redux-logic";
import { SinonStub, stub } from "sinon";

import LabkeyClient from "../../util/labkey-client";
import MMSClient from "../../util/mms-client";

import {
    enableBatching,
    feedback,
    job,
    metadata,
    selection,
    setting,
    upload,
} from "../";
import { State } from "../types";

export interface ReduxLogicDependencies {
    dialog: {
        showMessageBox: SinonStub;
    };
    fms: FileManagementSystem;
    ipcRenderer: {
        on: SinonStub;
        send: SinonStub;
    };
    jssClient: JobStatusClient;
    labkeyClient: LabkeyClient;
    mmsClient: MMSClient;
    storage: {
        get: SinonStub,
        has: SinonStub;
        set: SinonStub;
    };
}

const host = "localhost";
const port = "80";
const protocol = "http";
const username = "foo";

export const fms = new FileManagementSystem({host, port});
export const jssClient = new JobStatusClient({host, port, username});
export const labkeyClient = new LabkeyClient({host, port, protocol});
export const mmsClient = new MMSClient({host, port, protocol, username});

export const mockReduxLogicDeps: ReduxLogicDependencies = {
    dialog: {
        showMessageBox: stub(),
    },
    fms,
    ipcRenderer: {
        on: stub(),
        send: stub(),
    },
    jssClient,
    labkeyClient,
    mmsClient,
    storage: {
        get: stub(),
        has: stub(),
        set: stub(),
    },
};

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

export function createMockReduxStore(initialState: State,
                                     reduxLogicDependencies: ReduxLogicDependencies = mockReduxLogicDeps) {
    const logicMiddleware = createLogicMiddleware(logics, reduxLogicDependencies);
    const middleware = applyMiddleware(logicMiddleware);
    const rootReducer = enableBatching<State>(combineReducers(reducers));

    if (initialState) {
        return createStore(rootReducer, initialState, middleware);
    }
    return createStore(rootReducer, middleware);
}
