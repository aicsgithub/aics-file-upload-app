import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import {
    CLEAR_FILE_METADATA_FOR_JOB,
    RECEIVE_METADATA,
    RESET_HISTORY,
    SEARCH_FILE_METADATA,
    UPDATE_PAGE_HISTORY
} from "./constants";
import {
    ClearFileMetadataForJobAction,
    MetadataStateBranch,
    ReceiveMetadataAction,
    ResetHistoryAction,
    SearchFileMetadataAction,
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
    users: [],
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
    [SEARCH_FILE_METADATA]: {
        accepts: (action: AnyAction): action is SearchFileMetadataAction => action.type === SEARCH_FILE_METADATA,
        perform: (state: MetadataStateBranch) => ({
            ...state,
            fileMetadataSearchResults: undefined,
            fileMetadataSearchResultsAsTable: undefined,
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
    [CLEAR_FILE_METADATA_FOR_JOB]: {
        accepts: (action: AnyAction): action is ClearFileMetadataForJobAction => action.type === CLEAR_FILE_METADATA_FOR_JOB,
        perform: (state: MetadataStateBranch) => ({
            ...state,
            fileMetadataForJob: undefined,
        }),
    }
};

export default makeReducer<MetadataStateBranch>(actionToConfigMap, initialState);
