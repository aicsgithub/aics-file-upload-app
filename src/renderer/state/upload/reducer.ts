import {
    omit,
    uniq,
    without,
} from "lodash";
import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";
import { RESET_HISTORY } from "../metadata/constants";

import { TypeToDescriptionMap } from "../types";
import { getReduxUndoFilterFn, makeReducer } from "../util";
import {
    APPLY_TEMPLATE,
    ASSOCIATE_FILES_AND_WELLS,
    ASSOCIATE_FILES_AND_WORKFLOWS,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOADS,
    getUploadRowKey,
    INITIATE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    RETRY_UPLOAD,
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

            const { barcode, wellIds, rowIds } = action.payload;

            return rowIds.reduce((accum: UploadStateBranch, { file, positionIndex }) => {
                const key = getUploadRowKey(file, positionIndex);
                return {
                    ...accum,
                    [key]: {
                        ...accum[key],
                        barcode,
                        file,
                        positionIndex,
                        wellIds: accum[key] ?
                            uniq([...accum[key].wellIds, ...wellIds]) : wellIds,
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
            const { deleteUpload, fullPath, positionIndex, wellIds: wellIdsToRemove } = action.payload;
            const key = getUploadRowKey(fullPath, positionIndex);
            const wellIds = without(state[key].wellIds, ...wellIdsToRemove);
            if (!wellIds.length && deleteUpload) {
                const stateWithoutFile = { ...state };
                delete stateWithoutFile[key];
                return stateWithoutFile;
            }
            return {
                ...state,
                [key]: {
                    ...state[key],
                    wellIds,
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
    [DELETE_UPLOADS]: {
        accepts: (action: AnyAction): action is RemoveUploadsAction => action.type === DELETE_UPLOADS,
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
            return {
                ...state,
                [action.payload.key]: {
                    ...state[action.payload.key],
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
    filter: getReduxUndoFilterFn([
        INITIATE_UPLOAD,
        JUMP_TO_PAST_UPLOAD,
        JUMP_TO_UPLOAD,
        CLEAR_UPLOAD_HISTORY,
        RETRY_UPLOAD,
    ]),
    initTypes: [RESET_HISTORY],
    jumpToPastType: JUMP_TO_PAST_UPLOAD,
    jumpType: JUMP_TO_UPLOAD,
    limit: 100,
};
export default undoable(upload, options);
