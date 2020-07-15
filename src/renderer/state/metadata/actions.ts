import { BarcodePrefix } from "../../services/labkey-client/types";
import { AsyncRequest, MetadataStateBranch } from "../types";

import {
  CLEAR_FILE_METADATA_FOR_JOB,
  CLEAR_OPTIONS_FOR_LOOKUP,
  CREATE_BARCODE,
  EXPORT_FILE_METADATA,
  GET_ANNOTATIONS,
  GET_BARCODE_SEARCH_RESULTS,
  GET_OPTIONS_FOR_LOOKUP,
  GET_TEMPLATES,
  RECEIVE_METADATA,
  REQUEST_FILE_METADATA_FOR_JOB,
  REQUEST_METADATA,
  RESET_HISTORY,
  SEARCH_FILE_METADATA,
  UPDATE_PAGE_HISTORY,
} from "./constants";
import { initialState } from "./reducer";
import {
  ClearFileMetadataForJobAction,
  ClearOptionsForLookupAction,
  CreateBarcodeAction,
  ExportFileMetadataAction,
  GetAnnotationsAction,
  GetBarcodeSearchResultsAction,
  GetOptionsForLookupAction,
  GetTemplatesAction,
  ReceiveMetadataAction,
  RequestFileMetadataForJobAction,
  RequestMetadataAction,
  ResetHistoryAction,
  SearchConfig,
  SearchFileMetadataAction,
  UpdatePageHistoryMapAction,
} from "./types";

export function requestAnnotations(): GetAnnotationsAction {
  return {
    type: GET_ANNOTATIONS,
  };
}

export function clearOptionsForLookup(
  lookupAnnotationName: keyof MetadataStateBranch
): ClearOptionsForLookupAction {
  return {
    payload: lookupAnnotationName,
    type: CLEAR_OPTIONS_FOR_LOOKUP,
  };
}

export function retrieveOptionsForLookup(
  lookupAnnotationName: string,
  searchStr?: string
): GetOptionsForLookupAction {
  return {
    payload: {
      lookupAnnotationName,
      searchStr,
    },
    type: GET_OPTIONS_FOR_LOOKUP,
  };
}

export function receiveMetadata(
  metadata: Partial<MetadataStateBranch> = initialState,
  requestType: AsyncRequest | string = AsyncRequest.GET_METADATA
): ReceiveMetadataAction {
  return {
    payload: {
      metadata,
      requestType,
    },
    type: RECEIVE_METADATA,
  };
}

export function requestMetadata(): RequestMetadataAction {
  return {
    type: REQUEST_METADATA,
  };
}

export function requestBarcodeSearchResults(
  searchStr: string
): GetBarcodeSearchResultsAction {
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

export function createBarcode(
  barcodePrefix: BarcodePrefix
): CreateBarcodeAction {
  return {
    payload: barcodePrefix,
    type: CREATE_BARCODE,
  };
}

export function updatePageHistory(
  page: string,
  selectionIndex: number,
  uploadIndex: number,
  templateIndex: number
): UpdatePageHistoryMapAction {
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

export function searchFileMetadata(
  searchConfig: SearchConfig
): SearchFileMetadataAction {
  return {
    payload: searchConfig,
    type: SEARCH_FILE_METADATA,
  };
}

export function requestFileMetadataForJob(
  fileIds: string[]
): RequestFileMetadataForJobAction {
  return {
    payload: fileIds,
    type: REQUEST_FILE_METADATA_FOR_JOB,
  };
}

export function clearFileMetadataForJob(): ClearFileMetadataForJobAction {
  return {
    type: CLEAR_FILE_METADATA_FOR_JOB,
  };
}

export function exportFileMetadataCSV(
  fileName: string
): ExportFileMetadataAction {
  return {
    payload: fileName,
    type: EXPORT_FILE_METADATA,
  };
}
