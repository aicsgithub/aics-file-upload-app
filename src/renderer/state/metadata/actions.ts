import {
    CREATE_BARCODE,
    GET_BARCODE_PREFIXES,
    GET_IMAGING_SESSIONS,
    RECEIVE_METADATA,
    REQUEST_METADATA,
    REQUEST_WORKFLOW_OPTIONS,
    UPDATE_PAGE_HISTORY,
} from "./constants";
import { initialState } from "./reducer";
import {
    BarcodePrefix,
    CreateBarcodeAction,
    GetBarcodePrefixesAction,
    GetImagingSessionsAction,
    MetadataStateBranch,
    ReceiveMetadataAction,
    RequestMetadataAction,
    RequestWorkflowOptionsAction,
    UpdatePageHistoryMapAction,
} from "./types";

export function receiveMetadata(payload: Partial<MetadataStateBranch> = initialState): ReceiveMetadataAction {
    return {
        payload,
        type: RECEIVE_METADATA,
    };
}

export function requestMetadata(): RequestMetadataAction {
    return {
        type: REQUEST_METADATA,
    };
}

// Imaging Sessions may be created if the user creates a plate during the upload process so this is expected to be
// called more frequently than requestMetadata
export function requestImagingSessions(): GetImagingSessionsAction {
    return {
        type: GET_IMAGING_SESSIONS,
    };
}

export function requestBarcodePrefixes(): GetBarcodePrefixesAction {
    return {
        type: GET_BARCODE_PREFIXES,
    };
}

export function requestWorkflows(): RequestWorkflowOptionsAction {
    return {
        type: REQUEST_WORKFLOW_OPTIONS,
    }
}
export function createBarcode(barcodePrefix: BarcodePrefix): CreateBarcodeAction {
    return {
        payload: barcodePrefix,
        type: CREATE_BARCODE,
    };
}

export function updatePageHistory(page: string, selectionIndex: number, uploadIndex: number):
    UpdatePageHistoryMapAction {
    return {
        payload: {
            selection: {
                [page]: selectionIndex,
            },
            upload: {
                [page]: uploadIndex,
            },
        },
        type: UPDATE_PAGE_HISTORY,
    };
}
