import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import { RECEIVE_METADATA, RESET_HISTORY, UPDATE_PAGE_HISTORY } from "./constants";
import {
    MetadataStateBranch,
    ReceiveMetadataAction,
    ResetHistoryAction,
    UpdatePageHistoryMapAction,
} from "./types";

export const initialState: MetadataStateBranch = {
    annotationLookups: [],
    annotationOptions: [],
    annotationTypes: [],
    annotations: [],
    barcodePrefixes: [],
    barcodeSearchResults: [],
    channels: [],
    history: {
        selection: {},
        template: {},
        upload: {},
    },
    imagingSessions: [],
    lookups: [],
    templates: [],
    units: [],
    workflowOptions: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [RECEIVE_METADATA]: {
        accepts: (action: AnyAction): action is ReceiveMetadataAction => action.type === RECEIVE_METADATA,
        perform: (state: MetadataStateBranch, action: ReceiveMetadataAction) => ({ ...state, ...action.payload }),
    },
    [RESET_HISTORY]: {
        accepts: (action: AnyAction): action is ResetHistoryAction => action.type === RESET_HISTORY,
        perform: (state: MetadataStateBranch) => ({
            ...state,
            history: {
                selection: {},
                template: {},
                upload: {},
            },
        }),
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
                template: {
                    ...state.history.template,
                    ...action.payload.template,
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
