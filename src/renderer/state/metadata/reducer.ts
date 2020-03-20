import { uniq } from "lodash";
import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { REPLACE_UPLOAD } from "../upload/constants";
import { ReplaceUploadAction } from "../upload/types";
import { makeReducer } from "../util";

import {
    CLEAR_CURRENT_UPLOAD,
    CLEAR_FILE_METADATA_FOR_JOB,
    CLEAR_OPTIONS_FOR_LOOKUP, GATHER_UPLOAD_DRAFT_NAMES,
    RECEIVE_METADATA,
    RESET_HISTORY,
    SEARCH_FILE_METADATA,
    SET_CURRENT_UPLOAD,
    UPDATE_PAGE_HISTORY,
} from "./constants";
import {
    ClearCurrentUploadAction,
    ClearFileMetadataForJobAction,
    ClearOptionsForLookupAction, GatherUploadDraftNamesAction,
    MetadataStateBranch,
    ReceiveMetadataAction,
    ResetHistoryAction,
    SearchFileMetadataAction,
    SetCurrentUploadAction,
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
    uploadDraftNames: [],
    users: [],
    workflowOptions: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [CLEAR_OPTIONS_FOR_LOOKUP]: {
        accepts: (action: AnyAction): action is ClearOptionsForLookupAction => action.type === CLEAR_OPTIONS_FOR_LOOKUP,
        perform: (state: MetadataStateBranch, action: ClearOptionsForLookupAction) =>
            ({...state, [action.payload]: []}),
    },
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
        accepts: (action: AnyAction): action is ClearFileMetadataForJobAction =>
            action.type === CLEAR_FILE_METADATA_FOR_JOB,
        perform: (state: MetadataStateBranch) => ({
            ...state,
            fileMetadataForJob: undefined,
        }),
    },
    [GATHER_UPLOAD_DRAFT_NAMES]: {
        accepts: (action: AnyAction): action is GatherUploadDraftNamesAction =>
            action.type === GATHER_UPLOAD_DRAFT_NAMES,
        perform: (state: MetadataStateBranch, action: GatherUploadDraftNamesAction) => ({
            ...state,
            uploadDraftNames: uniq(action.payload),
        }),
    },
    [REPLACE_UPLOAD]: {
        accepts: (action: AnyAction): action is ReplaceUploadAction =>
            action.type === REPLACE_UPLOAD,
        perform: (state: MetadataStateBranch, action: ReplaceUploadAction) => ({
            ...state,
            currentUpload: action.payload.metadata,
        }),
    },
    [SET_CURRENT_UPLOAD]: {
        accepts: (action: AnyAction): action is SetCurrentUploadAction =>
            action.type === SET_CURRENT_UPLOAD,
        perform: (state: MetadataStateBranch, action: SetCurrentUploadAction) => ({
            ...state,
            currentUpload: action.payload,
        }),
    },
    [CLEAR_CURRENT_UPLOAD]: {
        accepts: (action: AnyAction): action is ClearCurrentUploadAction => action.type === CLEAR_CURRENT_UPLOAD,
        perform: (state: MetadataStateBranch) => ({
            ...state,
            currentUpload: undefined,
        }),
    },
};

export default makeReducer<MetadataStateBranch>(actionToConfigMap, initialState);
