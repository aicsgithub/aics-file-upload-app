import {
    applyMiddleware,
    combineReducers,
    createStore,
} from "redux";
import { createLogicMiddleware } from "redux-logic";
import * as sinon from "sinon";
import { SinonStub } from "sinon";

import {
    enableBatching,
    feedback,
    metadata,
    selection,
    upload,
} from "../";
import { State } from "../types";

export interface ReduxLogicDependencies {
    httpClient: {
        get: SinonStub,
        post: SinonStub,
    };
    dialog: {
        showMessageBox: SinonStub;
    };
}

export const mockReduxLogicDeps: ReduxLogicDependencies = {
    dialog: {
        showMessageBox: sinon.stub(),
    },
    httpClient: {
        get: sinon.stub(),
        post: sinon.stub(),
    },
};

const reducers = {
    feedback: feedback.reducer,
    metadata: metadata.reducer,
    selection: selection.reducer,
    upload: upload.reducer,
};

const logics = [
    ...metadata.logics,
    ...selection.logics,
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
