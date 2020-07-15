import { ColumnProps } from "antd/es/table";

import { BarcodePrefix } from "../../services/labkey-client/types";
import { AsyncRequest, MetadataStateBranch, SearchResultRow } from "../types";

// This wrapper interface is merely to convince ts-lint that title is always present
export interface SearchResultsHeader extends ColumnProps<SearchResultRow> {
  title: string;
}

export interface SearchConfig {
  annotation?: string;
  fileIds?: string[];
  searchValue?: string;
  templateId?: number;
  user?: string;
}

export interface GetAnnotationsAction {
  type: string;
}

export interface GetOptionsForLookupAction {
  payload: {
    lookupAnnotationName: string;
    searchStr?: string;
  };
  type: string;
}

export interface RequestFileMetadataForJobAction {
  payload: string[];
  type: string;
}

export interface ClearOptionsForLookupAction {
  payload: keyof MetadataStateBranch; // lookupAnnotationName
  type: string;
}

export interface ClearFileMetadataForJobAction {
  type: string;
}

export interface ReceiveMetadataAction {
  payload: {
    metadata: Partial<MetadataStateBranch>;
    requestType: AsyncRequest | string;
  };
  type: string;
}

export interface RequestMetadataAction {
  type: string;
}

export interface UpdatePageHistoryMapAction {
  payload: {
    selection: {
      [page: string]: number;
    };
    template: {
      [page: string]: number;
    };
    upload: {
      [page: string]: number;
    };
  };
  type: string;
}

export interface CreateBarcodeAction {
  payload: BarcodePrefix;
  type: string;
}

export interface GetBarcodeSearchResultsAction {
  payload: string;
  type: string;
}

export interface GetTemplatesAction {
  type: string;
}

export interface ResetHistoryAction {
  type: string;
}

export interface SearchFileMetadataAction {
  payload: SearchConfig;
  type: string;
}

export interface ExportFileMetadataAction {
  payload: string;
  type: string;
}
