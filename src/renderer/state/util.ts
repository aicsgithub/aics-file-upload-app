import { stat as fsStat, Stats } from "fs";
import { uniq } from "lodash";
import { resolve as resolvePath } from "path";
import {
    AnyAction,
    Reducer,
} from "redux";
import { FilterFunction, StateWithHistory } from "redux-undo";
import { promisify } from "util";

import { APP_ID } from "../constants";
import { canUserRead } from "../util";
import { CurrentUpload } from "./metadata/types";
import { UploadFileImpl } from "./selection/models/upload-file";
import { UploadFile } from "./selection/types";

import {
    BatchedAction, LocalStorage, State,
    TypeToDescriptionMap,
} from "./types";
import { DRAFT_KEY } from "./upload/constants";

const stat = promisify(fsStat);

export function makeConstant(associatedReducer: string, actionType: string) {
    return `${APP_ID}/${associatedReducer.toUpperCase()}/${actionType.toUpperCase()}`;
}

export function makeReducer<S>(typeToDescriptionMap: TypeToDescriptionMap, initialState: S): Reducer<S> {
    return (state: S = initialState, action: AnyAction) => {
        const description = typeToDescriptionMap[action.type];
        if (!description) {
            return state;
        }

        if (description.accepts(action)) {
            return description.perform(state, action);
        }

        return state;
    };
}

const BATCH_ACTIONS = makeConstant("batch", "batch-actions");

export function batchActions(actions: AnyAction[], type: string = BATCH_ACTIONS): BatchedAction {
    return { type, batch: true, payload: actions };
}

function actionIsBatched(action: AnyAction): action is BatchedAction {
    return action && action.batch && Array.isArray(action.payload);
}

export function enableBatching<S>(reducer: Reducer<S>): Reducer<S> {
    return function batchingReducer(state: S | undefined, action: AnyAction): S {
        if (actionIsBatched(action) && state) {
            return action.payload.reduce(batchingReducer, state);
        }
        return reducer(state, action);
    };
}

export function getActionFromBatch(batchAction: AnyAction, type: string): AnyAction | undefined {
    if (actionIsBatched(batchAction) && type) {
        const actions = batchAction.payload;
        return actions.find((a) => a.type === type);
    } else if (batchAction.type === type) {
        return batchAction;
    }

    return undefined;
}

export const getReduxUndoFilterFn = (excludeActions: string[]): FilterFunction =>
    <T>(action: AnyAction, currentState: T, previousHistory: StateWithHistory<T>) => {
    return !excludeActions.includes(action.type) && currentState !== previousHistory.present;
};

export const mergeChildPaths = (filePaths: string[]): string[] => {
    filePaths = uniq(filePaths);

    return filePaths.filter((filePath) => {
        const otherFilePaths = filePaths.filter((otherFilePath) => otherFilePath !== filePath);
        return !otherFilePaths.find((otherFilePath) => filePath.indexOf(otherFilePath) === 0);
    });
};

export const getUploadFilePromise = async (name: string, path: string): Promise<UploadFile> => {
    const fullPath = resolvePath(path, name);
    const stats: Stats = await stat(fullPath);
    const isDirectory = stats.isDirectory();
    const canRead = await canUserRead(fullPath);
    const file = new UploadFileImpl(name, path, isDirectory, canRead);
    if (isDirectory && canRead) {
        file.files = await Promise.all(await file.loadFiles());
    }
    return file;
};

export const saveUploadDraftToLocalStorage =
    (storage: LocalStorage, draftName: string, state: State): CurrentUpload => {
    const draftKey = `${DRAFT_KEY}.${draftName}`;
    const now = new Date();
    const metadata: CurrentUpload = {
        created: now,
        modified: now,
        name: draftName,
    };
    const draft = storage.get(draftKey);
    if (draft) {
        metadata.created = draft.metadata.created;
    }

    storage.set(draftKey, { metadata, state });

    return metadata;
};
