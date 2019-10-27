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
    template,
    upload,
} from "../";
import { LocalStorage, State } from "../types";

export interface ReduxLogicDependencies {
    fms: FileManagementSystem;
    ipcRenderer: {
        on: SinonStub;
        send: SinonStub;
    };
    jssClient: JobStatusClient;
    labkeyClient: LabkeyClient;
    mmsClient: MMSClient;
    remote: {
        Menu: {
            getApplicationMenu: SinonStub;
        };
        dialog: {
            showMessageBox: SinonStub;
        };
    };
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
const localStorage: LocalStorage = {
    clear: stub(),
    get: stub(),
    set: stub(),
};

export const fms = new FileManagementSystem({host, port});
export const jssClient = new JobStatusClient({host, port, username});
export const labkeyClient = new LabkeyClient({host, localStorage, port, protocol});
export const mmsClient = new MMSClient({host, localStorage, port, protocol, username});

export const mockReduxLogicDeps: ReduxLogicDependencies = {
    fms,
    ipcRenderer: {
        on: stub(),
        send: stub(),
    },
    jssClient,
    labkeyClient,
    mmsClient,
    remote: {
        Menu: {
            getApplicationMenu: stub(),
        },
        dialog: {
            showMessageBox: stub(),
        },
    },
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
    template: template.reducer,
    upload: upload.reducer,
};

const logics = [
    ...feedback.logics,
    ...job.logics,
    ...metadata.logics,
    ...selection.logics,
    ...setting.logics,
    ...template.logics,
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
