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

export interface ReduxLogicDependencies {
    dialog: {
        showMessageBox: SinonStub;
    };
    fms: {
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
    storage: {
        get: SinonStub,
        has: SinonStub;
        set: SinonStub;
    };
}

export const mockReduxLogicDeps: ReduxLogicDependencies = {
    dialog: {
        showMessageBox: stub(),
    },
    fms: {
        validateMetadata: stub(),
    },
    httpClient: {
        get: stub(),
        post: stub(),
    },
    ipcRenderer: {
        on: stub(),
        send: stub(),
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
