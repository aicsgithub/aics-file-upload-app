import {
    omit,
    uniq,
    without,
} from "lodash";
import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    APPLY_TEMPLATE,
    ASSOCIATE_FILES_AND_WELLS,
    ASSOCIATE_FILES_AND_WORKFLOWS,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOAD,
    getUploadRowKey,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    UNDO_FILE_WELL_ASSOCIATION,
    UNDO_FILE_WORKFLOW_ASSOCIATION,
    UPDATE_UPLOAD,
    UPDATE_UPLOADS,
} from "./constants";
import {
    ApplyTemplateAction,
    AssociateFilesAndWellsAction,
    AssociateFilesAndWorkflowsAction,
    RemoveUploadsAction,
    UndoFileWellAssociationAction,
    UndoFileWorkflowAssociationAction,
    UpdateUploadAction,
    UpdateUploadsAction,
    UploadStateBranch,
} from "./types";

export const initialState = {

};

const actionToConfigMap: TypeToDescriptionMap = {
    [ASSOCIATE_FILES_AND_WELLS]: {
        accepts: (action: AnyAction): action is AssociateFilesAndWellsAction =>
            action.type === ASSOCIATE_FILES_AND_WELLS,
        perform: (state: UploadStateBranch, action: AssociateFilesAndWellsAction) => {
            const nextState = {...state};

            const { barcode, wellIds, wellLabels, fullPaths } = action.payload;

            return fullPaths.reduce((accum: UploadStateBranch, fullPath: string) => {
                const key = getUploadRowKey(fullPath);
                return {
                    ...accum,
                    [key]: {
                        ...accum[key],
                        barcode,
                        file: fullPath,
                        wellIds: accum[key] ?
                            uniq([...accum[key].wellIds, ...wellIds]) : wellIds,
                        wellLabels: accum[key] ?
                            uniq([...accum[key].wellLabels, ...wellLabels]) : wellLabels,
                    },
                };
            }, nextState);
        },
    },
    [ASSOCIATE_FILES_AND_WORKFLOWS]: {
        accepts: (action: AnyAction): action is AssociateFilesAndWorkflowsAction =>
            action.type === ASSOCIATE_FILES_AND_WORKFLOWS,
        perform: (state: UploadStateBranch, action: AssociateFilesAndWorkflowsAction) => {
            const nextState = {...state};

            const { fullPaths, workflows } = action.payload;
            const workflowNames = uniq(workflows.map((w) => w.name));

            return fullPaths.reduce((accum: UploadStateBranch, fullPath: string) => {
                const key = getUploadRowKey(fullPath);
                return ({
                    ...accum,
                    [key]: {
                        ...accum[key],
                        file: fullPath,
                        workflows: accum[key] && accum[key].workflows ?
                            uniq([...accum[key].workflows!, ...workflowNames]) : workflowNames,
                    },
                });
            }, nextState);
        },
    },
    [UNDO_FILE_WELL_ASSOCIATION]: {
        accepts: (action: AnyAction): action is UndoFileWellAssociationAction =>
            action.type === UNDO_FILE_WELL_ASSOCIATION,
        perform: (state: UploadStateBranch, action: UndoFileWellAssociationAction) => {
            const key = getUploadRowKey(action.payload.fullPath);
            const wellIds = without(state[key].wellIds, ...action.payload.wellIds);
            if (!wellIds.length) {
                const stateWithoutFile = { ...state };
                delete stateWithoutFile[key];
                return stateWithoutFile;
            }
            return {
                ...state,
                [key]: {
                    ...state[key],
                    wellIds,
                    wellLabels: without(state[key].wellLabels, ...action.payload.wellLabels),
                },
            };
        },
    },
    [UNDO_FILE_WORKFLOW_ASSOCIATION]: {
        accepts: (action: AnyAction): action is UndoFileWorkflowAssociationAction =>
            action.type === UNDO_FILE_WORKFLOW_ASSOCIATION,
        perform: (state: UploadStateBranch, action: UndoFileWorkflowAssociationAction) => {
            const key = getUploadRowKey(action.payload.fullPath);
            const currentWorkflows = state[key].workflows;
            if (!currentWorkflows) {
                return state;
            }
            const workflows = without(currentWorkflows, ...action.payload.workflows.map((w) => w.name));
            if (!workflows.length) {
                const stateWithoutFile = { ...state };
                delete stateWithoutFile[key];
                return stateWithoutFile;
            }
            return {
                ...state,
                [key]: {
                    ...state[key],
                    workflows,
                },
            };
        },
    },
    [DELETE_UPLOAD]: {
        accepts: (action: AnyAction): action is RemoveUploadsAction => action.type === DELETE_UPLOAD,
        perform: (state: UploadStateBranch, action: RemoveUploadsAction) => omit(state, action.payload),
    },
    [APPLY_TEMPLATE]: {
        accepts: (action: AnyAction): action is ApplyTemplateAction => action.type === APPLY_TEMPLATE,
        perform: (state: UploadStateBranch, action: ApplyTemplateAction) => ({
            ...state,
            ...action.payload.uploads,
        }),
    },
    [UPDATE_UPLOAD]: {
        accepts: (action: AnyAction): action is UpdateUploadAction => action.type === UPDATE_UPLOAD,
        perform: (state: UploadStateBranch, action: UpdateUploadAction) => {
            const key = getUploadRowKey(action.payload.key);
            return {
                ...state,
                [key]: {
                    ...state[key],
                    ...action.payload.upload,
                },
            };
        },
    },
    [UPDATE_UPLOADS]: {
        accepts: (action: AnyAction): action is UpdateUploadAction => action.type === UPDATE_UPLOADS,
        perform: (state: UploadStateBranch, action: UpdateUploadsAction) => ({
            ...state,
            ...action.payload,
        }),
    },
};

const upload = makeReducer<UploadStateBranch>(actionToConfigMap, initialState);

const options: UndoableOptions = {
    clearHistoryType: CLEAR_UPLOAD_HISTORY,
    jumpToPastType: JUMP_TO_PAST_UPLOAD,
    jumpType: JUMP_TO_UPLOAD,
    limit: 100,
};
export default undoable(upload, options);
