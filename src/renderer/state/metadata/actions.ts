import {
    CREATE_BARCODE,
    GET_BARCODE_SEARCH_RESULTS,
    RECEIVE_METADATA,
    REQUEST_METADATA,
    UPDATE_PAGE_HISTORY,
} from "./constants";
import { initialState } from "./reducer";
import {
    BarcodePrefix,
    CreateBarcodeAction,
    GetBarcodeSearchResultsAction,
    MetadataStateBranch,
    ReceiveMetadataAction,
    RequestMetadataAction,
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

export function requestBarcodeSearchResults(searchStr: string): GetBarcodeSearchResultsAction {
    return {
        payload: searchStr,
        type: GET_BARCODE_SEARCH_RESULTS,
    };
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
