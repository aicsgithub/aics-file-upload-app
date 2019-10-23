import {
    omit,
    uniq,
    uniqBy,
    without,
} from "lodash";
import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import { Workflow } from "../selection/types";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    ASSOCIATE_FILES_AND_WELLS,
    ASSOCIATE_FILES_AND_WORKFLOWS,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    UNDO_FILE_WELL_ASSOCIATION,
    UNDO_FILE_WORKFLOW_ASSOCIATION,
    APPLY_TEMPLATE,
    UPDATE_UPLOAD
} from "./constants";
import {
    AssociateFilesAndWellsAction,
    AssociateFilesAndWorkflowsAction,
    RemoveUploadsAction,
    UndoFileWellAssociationAction,
    UndoFileWorkflowAssociationAction,
    ApplyTemplateAction,
    UpdateUploadAction,
    UploadStateBranch
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

            return fullPaths.reduce((accum: UploadStateBranch, fullPath: string) => ({
                ...accum,
                [fullPath]: {
                    ...accum[fullPath],
                    barcode,
                    wellIds: accum[fullPath] ?
                        uniq([...accum[fullPath].wellIds, ...wellIds]) : wellIds,
                    wellLabels: accum[fullPath] ?
                        uniq([...accum[fullPath].wellLabels, ...wellLabels]) : wellLabels,
                },
            }), nextState);
        },
    },
    [ASSOCIATE_FILES_AND_WORKFLOWS]: {
        accepts: (action: AnyAction): action is AssociateFilesAndWorkflowsAction =>
            action.type === ASSOCIATE_FILES_AND_WORKFLOWS,
        perform: (state: UploadStateBranch, action: AssociateFilesAndWorkflowsAction) => {
            const nextState = {...state};

            const { fullPaths, workflows } = action.payload;

            return fullPaths.reduce((accum: UploadStateBranch, fullPath: string) => ({
                ...accum,
                [fullPath]: {
                    ...accum[fullPath],
                    workflows: accum[fullPath] && accum[fullPath].workflows ?
                        uniqBy([...accum[fullPath].workflows!, ...workflows], "workflowId") : workflows,
                },
            }), nextState);
        },
    },
    [UNDO_FILE_WELL_ASSOCIATION]: {
        accepts: (action: AnyAction): action is UndoFileWellAssociationAction =>
            action.type === UNDO_FILE_WELL_ASSOCIATION,
        perform: (state: UploadStateBranch, action: UndoFileWellAssociationAction) => {
            const wellIds = without(state[action.payload.fullPath].wellIds, ...action.payload.wellIds);
            if (!wellIds.length) {
                const stateWithoutFile = { ...state };
                delete stateWithoutFile[action.payload.fullPath];
                return stateWithoutFile;
            }
            return {
                ...state,
                [action.payload.fullPath]: {
                    ...state[action.payload.fullPath],
                    wellIds,
                    wellLabels: without(state[action.payload.fullPath].wellLabels, ...action.payload.wellLabels),
                },
            };
        },
    },
    [UNDO_FILE_WORKFLOW_ASSOCIATION]: {
        accepts: (action: AnyAction): action is UndoFileWorkflowAssociationAction =>
            action.type === UNDO_FILE_WORKFLOW_ASSOCIATION,
        perform: (state: UploadStateBranch, action: UndoFileWorkflowAssociationAction) => {
            const currentWorkflows = state[action.payload.fullPath].workflows;
            if (!currentWorkflows) {
                return state;
            }
            const unwantedWorkflowIds = action.payload.workflows.map((workflow: Workflow) => workflow.workflowId);
            const workflows = currentWorkflows.filter((workflow: Workflow) => (
                !unwantedWorkflowIds.includes(workflow.workflowId)
            ));
            if (!workflows.length) {
                const stateWithoutFile = { ...state };
                delete stateWithoutFile[action.payload.fullPath];
                return stateWithoutFile;
            }
            return {
                ...state,
                [action.payload.fullPath]: {
                    ...state[action.payload.fullPath],
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
        perform: (state: UploadStateBranch, action: UpdateUploadAction) => ({
            ...state,
            [action.payload.filePath]: {
                ...state[action.payload.filePath],
                ...action.payload.upload,
            },
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
