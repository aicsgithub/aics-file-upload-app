import {
    CREATE_BARCODE,
    EXPORT_FILE_METADATA,
    GET_ANNOTATIONS,
    GET_BARCODE_SEARCH_RESULTS,
    GET_OPTIONS_FOR_LOOKUP,
    GET_TEMPLATES,
    RECEIVE_METADATA,
    REQUEST_METADATA,
    RESET_HISTORY,
    SEARCH_FILE_METADATA,
    UPDATE_PAGE_HISTORY,
} from "./constants";
import { initialState } from "./reducer";
import {
    BarcodePrefix,
    CreateBarcodeAction,
    ExportFileMetadataAction,
    GetAnnotationsAction,
    GetBarcodeSearchResultsAction,
    GetOptionsForLookupAction,
    GetTemplatesAction,
    MetadataStateBranch,
    ReceiveMetadataAction,
    RequestMetadataAction,
    ResetHistoryAction,
    SearchFileMetadataAction,
    UpdatePageHistoryMapAction,
} from "./types";

export function requestAnnotations(): GetAnnotationsAction {
    return {
        type: GET_ANNOTATIONS,
    };
}

export function retrieveOptionsForLookup(payload: number): GetOptionsForLookupAction {
    return {
        payload,
        type: GET_OPTIONS_FOR_LOOKUP,
    };
}

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

export function requestTemplates(): GetTemplatesAction {
    return {
        type: GET_TEMPLATES,
    };
}

export function createBarcode(barcodePrefix: BarcodePrefix): CreateBarcodeAction {
    return {
        payload: barcodePrefix,
        type: CREATE_BARCODE,
    };
}

export function updatePageHistory(page: string, selectionIndex: number, uploadIndex: number, templateIndex: number):
    UpdatePageHistoryMapAction {
    return {
        payload: {
            selection: {
                [page]: selectionIndex,
            },
            template: {
                [page]: templateIndex,
            },
            upload: {
                [page]: uploadIndex,
            },
        },
        type: UPDATE_PAGE_HISTORY,
    };
}

export function resetHistory(): ResetHistoryAction {
    return {
        type: RESET_HISTORY,
    };
}

export function searchFileMetadata(annotationName: string, searchValue: string): SearchFileMetadataAction {
    return {
        payload: {
            annotationName,
            searchValue,
        },
        type: SEARCH_FILE_METADATA,
    };
}

export function exportFileMetadataCSV(fileName: string): ExportFileMetadataAction {
    return {
        payload: fileName,
        type: EXPORT_FILE_METADATA,
    };
}
