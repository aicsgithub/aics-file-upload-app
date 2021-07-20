import { BarcodePrefix } from "../../services/labkey-client/types";
import { PlateResponse, WellResponse } from "../../services/mms-client/types";
import { AsyncRequest, MetadataStateBranch } from "../types";

export interface GetOptionsForLookupAction {
  payload: {
    lookupAnnotationName: string;
    searchStr?: string;
  };
  type: string;
}

export interface ClearOptionsForLookupAction {
  payload: keyof MetadataStateBranch; // lookupAnnotationName
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

export interface RequestAnnotationUsage {
  payload: number;
  type: string;
}

export interface ReceiveAnnotationUsageAction {
  payload: {
    annotationId: number;
    hasAnnotationValues: boolean;
  };
  type: string;
}

export interface CreateBarcodeAction {
  payload: { barcodePrefix: BarcodePrefix; uploadKey: string };
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

export interface SetPlateBarcodeToImagingSessionsAction {
  payload: PlateBarcodeToImagingSessions;
  type: string;
}

export interface PlateWithImagingSession {
  imagingSessionId?: number;
  name?: string;
  plate: PlateResponse;
  wells: WellResponse[];
}

export interface PlateBarcodeToImagingSessions {
  [plateBarcode: string]: {
    [imagingSessionId: number]: PlateWithImagingSession;
  };
}
