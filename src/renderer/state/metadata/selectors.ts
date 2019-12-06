import { ImageModelMetadata } from "@aics/aicsfiles/type-declarations/types";
import { ColumnProps } from "antd/lib/table";
import { uniq, uniqBy, startCase, without } from "lodash";
import { createSelector } from "reselect";

import { BarcodeSelectorOption } from "../../containers/SelectUploadType";
import { LabkeyPlateResponse } from "../../util/labkey-client/types";
import { getMetadataColumns } from "../setting/selectors";
import { Annotation, AnnotationOption, AnnotationType, AnnotationWithOptions, ColumnType } from "../template/types";
import { State } from "../types";
import { MAIN_FILE_COLUMNS, UNIMPORTANT_COLUMNS } from "./constants";
import { SearchResultRow } from "./types";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
export const getAnnotationLookups = (state: State) => state.metadata.annotationLookups;
export const getAnnotationOptions = (state: State) => state.metadata.annotationOptions;
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
export const getFileMetadataSearchResults = (state: State) => state.metadata.fileMetadataSearchResults;
export const getOptionsForLookup = (state: State) => state.metadata.optionsForLookup;
export const getUsers = (state: State) => state.metadata.users;

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

export const getSearchResultsHeader = createSelector([
    getFileMetadataSearchResults,
    getMetadataColumns,
], (rows, extraMetadataColumns): Array<ColumnProps<SearchResultRow>> | undefined => {
    if (!rows) {
        return undefined;
    }
    let columns: string[] = [];
    rows.forEach((row) => {
        columns.push(...Object.keys(row));
    });
    columns = without(uniq(columns), ...MAIN_FILE_COLUMNS, ...UNIMPORTANT_COLUMNS); // TODO: Do they even need to be added here???
    return [...MAIN_FILE_COLUMNS, ...columns, ...extraMetadataColumns].map((column) => ({
        dataIndex: column,
        key: column,
        sort: column === 'fileId' ? 'descend' : undefined,
        sorter: (a: SearchResultRow, b: SearchResultRow) => `${a[column]}`.localeCompare(`${b[column]}`),
        title: startCase(column),
    }));
});

export const getNumberOfFiles = createSelector([
    getFileMetadataSearchResults,
], (rows?: ImageModelMetadata[]): number => {
    if (!rows || !rows.length) {
        return 0;
    }
    return uniq(rows.map(({ fileId }) => fileId)).length;
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

export const getAnnotationsWithAnnotationOptions = createSelector([
    getAnnotations,
    getAnnotationOptions,
], (annotations: Annotation[], annotationOptions: AnnotationOption[]): AnnotationWithOptions[] => {
    return annotations.map((a) => {
        const options =  annotationOptions.filter((o) => o.annotationId === a.annotationId)
            .map((o) => o.value);
        return {
            ...a,
            annotationOptions: options.length ? options : undefined,
        };
    });
});
