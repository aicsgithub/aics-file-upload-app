import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import { RECEIVE_METADATA, UPDATE_PAGE_HISTORY } from "./constants";
import {
    MetadataStateBranch,
    ReceiveMetadataAction,
    UpdatePageHistoryMapAction,
} from "./types";

export const initialState = {
    barcodePrefixes: [],
    barcodes: [],
    history: {
        selection: {},
        upload: {},
    },
    imagingSessions: [],
    units: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [RECEIVE_METADATA]: {
        accepts: (action: AnyAction): action is ReceiveMetadataAction => action.type === RECEIVE_METADATA,
        perform: (state: MetadataStateBranch, action: ReceiveMetadataAction) => ({ ...state, ...action.payload }),
    },
    [UPDATE_PAGE_HISTORY]: {
        accepts: (action: AnyAction): action is UpdatePageHistoryMapAction =>
            action.type === UPDATE_PAGE_HISTORY,
        perform: (state: MetadataStateBranch, action: UpdatePageHistoryMapAction) => ({
            ...state,
            history: {
                selection: {
                    ...state.history.selection,
                    ...action.payload.selection,
                },
                upload: {
                    ...state.history.upload,
                    ...action.payload.upload,
                },
            },
        }),
    },
};

export default makeReducer<MetadataStateBranch>(actionToConfigMap, initialState);
