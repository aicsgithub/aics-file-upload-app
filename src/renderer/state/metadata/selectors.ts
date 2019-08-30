import { uniqBy } from "lodash";
import { createSelector } from "reselect";
import { BarcodeSelectorOption } from "../../containers/EnterBarcode";

import { LabkeyPlateResponse } from "../../util/labkey-client/types";
import { State } from "../types";

// BASIC SELECTORS
export const getUnits = (state: State) => state.metadata.units;
export const getImagingSessions = (state: State) => state.metadata.imagingSessions;
export const getBarcodePrefixes = (state: State) => state.metadata.barcodePrefixes;
export const getSelectionHistory = (state: State) => state.metadata.history.selection;
export const getUploadHistory = (state: State) => state.metadata.history.upload;
export const getWorkflowOptions = (state: State) => state.metadata.workflowOptions;
export const getDatabaseMetadata = (state: State) => state.metadata.databaseMetadata;
export const getBarcodeSearchResults = (state: State) => state.metadata.barcodeSearchResults;

// COMPOSED SELECTORS
export const getUniqueBarcodeSearchResults = createSelector([
    getBarcodeSearchResults,
], (allPlates: LabkeyPlateResponse[]): BarcodeSelectorOption[] => {
    const uniquePlateBarcodes = uniqBy(allPlates, "barcode");
    return uniquePlateBarcodes.map((plate) => {
        const imagingSessionIds = allPlates
            .filter((otherPlate) => otherPlate.barcode === plate.barcode)
            .map((p) => p.imagingSessionId);
        return {
            barcode: plate.barcode,
            imagingSessionIds,
        };
    });
});
