import {
    applyMiddleware,
    combineReducers,
    createStore,
} from "redux";
import { createLogicMiddleware } from "redux-logic";
import { SinonStub, stub } from "sinon";

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
import { mockFailedUploadJob, mockSuccessfulUploadJob, mockWorkingUploadJob } from "./mocks";

export interface ReduxLogicDependencies {
    dialog: {
        showMessageBox: SinonStub;
    };
    fms: {
        retryUpload: SinonStub;
        uploadFiles: SinonStub;
        validateMetadata: SinonStub;
    };
    httpClient: {
        get: SinonStub;
        post: SinonStub;
    };
    ipcRenderer: {
        on: SinonStub;
        send: SinonStub;
    };
    jssClient: {
        createJob: SinonStub;
        getJob: SinonStub;
        getJobs: SinonStub;
        updateJob: SinonStub;
    };
    storage: {
        get: SinonStub,
        has: SinonStub;
        path: string;
        set: SinonStub;
    };
}

export const mockReduxLogicDeps: ReduxLogicDependencies = {
    dialog: {
        showMessageBox: stub(),
    },
    fms: {
        retryUpload: stub().resolves(),
        uploadFiles: stub().resolves(),
        validateMetadata: stub().resolves(),
    },
    httpClient: {
        get: stub(),
        post: stub(),
    },
    ipcRenderer: {
        on: stub(),
        send: stub(),
    },
    jssClient: {
        createJob: stub().resolves(mockSuccessfulUploadJob),
        getJob: stub(),
        getJobs: stub().resolves([mockSuccessfulUploadJob, mockWorkingUploadJob, mockFailedUploadJob]),
        updateJob: stub().resolves(mockSuccessfulUploadJob),
    },
    storage: {
        get: stub(),
        has: stub(),
        path: "anything",
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
