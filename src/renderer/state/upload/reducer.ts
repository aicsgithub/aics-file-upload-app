import { omit, uniq, without } from "lodash";
import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    ASSOCIATE_FILES_AND_WELLS,
    CLEAR_UPLOAD_HISTORY,
    DELETE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    UNDO_FILE_WELL_ASSOCIATION,
    UPDATE_SCHEMA,
    UPDATE_UPLOAD
} from "./constants";
import {
    AssociateFilesAndWellsAction,
    RemoveUploadsAction,
    UndoFileWellAssociationAction,
    UpdateSchemaAction,
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
    [UNDO_FILE_WELL_ASSOCIATION]: {
        accepts: (action: AnyAction): action is UndoFileWellAssociationAction =>
            action.type === UNDO_FILE_WELL_ASSOCIATION,
        perform: (state: UploadStateBranch, action: UndoFileWellAssociationAction) => ({
            ...state,
            [action.payload.fullPath]: {
                ...state[action.payload.fullPath],
                wellIds: without(state[action.payload.fullPath].wellIds, ...action.payload.wellIds),
                wellLabels: without(state[action.payload.fullPath].wellLabels, ...action.payload.wellLabels),
            },
        }),
    },
    [DELETE_UPLOAD]: {
        accepts: (action: AnyAction): action is RemoveUploadsAction => action.type === DELETE_UPLOAD,
        perform: (state: UploadStateBranch, action: RemoveUploadsAction) => omit(state, action.payload),
    },
    [UPDATE_SCHEMA]: {
        accepts: (action: AnyAction): action is UpdateSchemaAction => action.type === UPDATE_SCHEMA,
        perform: (state: UploadStateBranch, action: UpdateSchemaAction) => ({
            ...state,
            ...action.payload.uploads
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
