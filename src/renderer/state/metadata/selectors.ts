import { uniqBy } from "lodash";
import { createSelector } from "reselect";
import { BarcodeSelectorOption } from "../../containers/EnterBarcode";

import { LabkeyPlateResponse } from "../../util/labkey-client/types";
import { Annotation, AnnotationType, ColumnType } from "../template/types";
import { State } from "../types";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
export const getAnnotationLookups = (state: State) => state.metadata.annotationLookups;
export const getAnnotationTypes = (state: State) => state.metadata.annotationTypes;
export const getUnits = (state: State) => state.metadata.units;
export const getImagingSessions = (state: State) => state.metadata.imagingSessions;
export const getLookups = (state: State) => state.metadata.lookups;
export const getBarcodePrefixes = (state: State) => state.metadata.barcodePrefixes;
export const getSelectionHistory = (state: State) => state.metadata.history.selection;
export const getTemplateHistory = (state: State) => state.metadata.history.template;
export const getUploadHistory = (state: State) => state.metadata.history.upload;
export const getWorkflowOptions = (state: State) => state.metadata.workflowOptions;
export const getBarcodeSearchResults = (state: State) => state.metadata.barcodeSearchResults;
export const getTemplates = (state: State) => state.metadata.templates;
export const getChannels = (state: State) => state.metadata.channels;

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

export const getBooleanAnnotationTypeId = createSelector([
    getAnnotationTypes,
], (annotationTypes: AnnotationType[]) => {
    const annotationType = annotationTypes.find((at) => at.name === ColumnType.BOOLEAN);
    return annotationType ? annotationType.annotationTypeId : undefined;
});

export const getLookupAnnotationTypeId = createSelector([
    getAnnotationTypes,
], (annotationTypes: AnnotationType[]) => {
    const annotationType = annotationTypes.find((at) => at.name === ColumnType.LOOKUP);
    return annotationType ? annotationType.annotationTypeId : undefined;
});

export const getNotesAnnotation = createSelector([
    getAnnotations,
], (annotations: Annotation[]): Annotation | undefined => {
    return  annotations.find((a) => a.name === "Notes");
});

export const getWellAnnotation = createSelector([
    getAnnotations,
], (annotations: Annotation[]): Annotation | undefined => {
    return annotations.find((a) => a.name === "Well");
});

export const getWorkflowAnnotation = createSelector([
    getAnnotations,
], (annotations: Annotation[]): Annotation | undefined => {
    return annotations.find((a) => a.name === "Workflow");
});
