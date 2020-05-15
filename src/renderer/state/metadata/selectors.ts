import { uniq, uniqBy } from "lodash";
import { createSelector } from "reselect";
import {
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../constants";

import { BarcodeSelectorOption } from "../../containers/SelectUploadType";
import { titleCase } from "../../util";
import { LabkeyPlateResponse } from "../../util/labkey-client/types";

import { getMetadataColumns } from "../setting/selectors";
import {
  Annotation,
  AnnotationOption,
  AnnotationType,
  AnnotationWithOptions,
  ColumnType,
} from "../template/types";
import { State } from "../types";

import { MAIN_FILE_COLUMNS, UNIMPORTANT_COLUMNS } from "./constants";
import { CurrentUpload, SearchResultRow, SearchResultsHeader } from "./types";

// BASIC SELECTORS
export const getMetadata = (state: State) => state.metadata;
export const getAllAnnotations = (state: State) => state.metadata.annotations;
export const getAnnotationLookups = (state: State) =>
  state.metadata.annotationLookups;
export const getAnnotationOptions = (state: State) =>
  state.metadata.annotationOptions;
export const getAnnotationTypes = (state: State) =>
  state.metadata.annotationTypes;
export const getUnits = (state: State) => state.metadata.units;
export const getImagingSessions = (state: State) =>
  state.metadata.imagingSessions;
export const getLookups = (state: State) => state.metadata.lookups;
export const getBarcodePrefixes = (state: State) =>
  state.metadata.barcodePrefixes;
export const getSelectionHistory = (state: State) =>
  state.metadata.history.selection;
export const getTemplateHistory = (state: State) =>
  state.metadata.history.template;
export const getUploadHistory = (state: State) => state.metadata.history.upload;
export const getWorkflowOptions = (state: State) =>
  state.metadata.workflowOptions;
export const getBarcodeSearchResults = (state: State) =>
  state.metadata.barcodeSearchResults;
export const getTemplates = (state: State) => state.metadata.templates;
export const getChannels = (state: State) => state.metadata.channels;
export const getFileMetadataSearchResults = (state: State) =>
  state.metadata.fileMetadataSearchResults;
export const getUsers = (state: State) => state.metadata.users;
export const getFileMetadataForJob = (state: State) =>
  state.metadata.fileMetadataForJob;
export const getUploadDrafts = (state: State) => state.metadata.uploadDrafts;
export const getCurrentUpload = (state: State) => state.metadata.currentUpload;

// Some annotations are used purely for displaying data in the File Explorer, here we exclude those
export const getAnnotations = createSelector(
  [getAllAnnotations],
  (allAnnotations: Annotation[]): Annotation[] =>
    allAnnotations.filter((annotation) => annotation.exposeToFileUploadApp)
);

// These annotations are used purely for displaying data to users in the File Explorer
export const getForbiddenAnnotationNames = createSelector(
  [getAllAnnotations],
  (allAnnotations: Annotation[]): Set<string> =>
    new Set(
      allAnnotations
        .filter((annotation) => !annotation.exposeToFileUploadApp)
        .map(({ name }) => name)
    )
);

// COMPOSED SELECTORS
export const getUniqueBarcodeSearchResults = createSelector(
  [getBarcodeSearchResults],
  (allPlates: LabkeyPlateResponse[]): BarcodeSelectorOption[] => {
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
  }
);

const getHeaderForFileMetadata = (
  rows?: SearchResultRow[],
  extraMetadataColumns: string[] = [],
  ellipsis = true
): SearchResultsHeader[] | undefined => {
  if (!rows || !extraMetadataColumns) {
    return undefined;
  }
  const annotationColumns = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((column) => {
      // Exclude all columns that aren't annotations
      if (
        !MAIN_FILE_COLUMNS.includes(column) &&
        !UNIMPORTANT_COLUMNS.includes(column)
      ) {
        annotationColumns.add(column);
      }
    });
  });
  // Spread the columns back in the order of MAIN_COLUMNS then ANNOTATIONS then EXTRA_FILE_METADATA
  const columns = [
    ...MAIN_FILE_COLUMNS,
    ...annotationColumns,
    ...extraMetadataColumns,
  ];
  return columns.map((column) => ({
    dataIndex: column,
    ellipsis,
    key: column,
    sorter: (a: SearchResultRow, b: SearchResultRow) =>
      `${a[column]}`.localeCompare(`${b[column]}`),
    title: column === "fileSize" ? "File Size (in bytes)" : titleCase(column),
  }));
};

export const getSearchResultsHeader = createSelector(
  [getFileMetadataSearchResults, getMetadataColumns],
  (rows, extraMetadataColumns): SearchResultsHeader[] | undefined => {
    return getHeaderForFileMetadata(rows, extraMetadataColumns, false);
  }
);

export const getFileMetadataForJobHeader = createSelector(
  [getFileMetadataForJob],
  (rows): SearchResultsHeader[] | undefined => {
    return getHeaderForFileMetadata(rows);
  }
);

export const getNumberOfFiles = createSelector(
  [getFileMetadataSearchResults],
  (rows?: SearchResultRow[]): number => {
    if (!rows || !rows.length) {
      return 0;
    }
    return uniq(rows.map(({ fileId }) => fileId)).length;
  }
);

const getAnnotationTypeId = (annotationTypeName: ColumnType) =>
  createSelector([getAnnotationTypes], (annotationTypes: AnnotationType[]) => {
    const annotationType = annotationTypes.find(
      (at) => at.name === annotationTypeName
    );
    return annotationType ? annotationType.annotationTypeId : undefined;
  });

export const getBooleanAnnotationTypeId = getAnnotationTypeId(
  ColumnType.BOOLEAN
);
export const getDropdownAnnotationTypeId = getAnnotationTypeId(
  ColumnType.DROPDOWN
);
export const getLookupAnnotationTypeId = getAnnotationTypeId(ColumnType.LOOKUP);
export const getNumberAnnotationTypeId = getAnnotationTypeId(ColumnType.NUMBER);
export const getTextAnnotationTypeId = getAnnotationTypeId(ColumnType.TEXT);
export const getDateAnnotationTypeId = getAnnotationTypeId(ColumnType.DATE);
export const getDateTimeAnnotationTypeId = getAnnotationTypeId(
  ColumnType.DATETIME
);

const getAnnotation = (annotationName: string) =>
  createSelector([getAnnotations], (annotations: Annotation[]):
    | Annotation
    | undefined => {
    return annotations.find((a) => a.name === annotationName);
  });

export const getNotesAnnotation = getAnnotation(NOTES_ANNOTATION_NAME);
export const getWellAnnotation = getAnnotation(WELL_ANNOTATION_NAME);
export const getWorkflowAnnotation = getAnnotation(WORKFLOW_ANNOTATION_NAME);

export const getAnnotationsWithAnnotationOptions = createSelector(
  [getAnnotations, getAnnotationOptions],
  (
    annotations: Annotation[],
    annotationOptions: AnnotationOption[]
  ): AnnotationWithOptions[] => {
    return annotations.map((a) => {
      const options = annotationOptions
        .filter((o) => o.annotationId === a.annotationId)
        .map((o) => o.value);
      return {
        ...a,
        annotationOptions: options.length ? options : undefined,
      };
    });
  }
);

export const getUploadDraftNames = createSelector(
  [getUploadDrafts],
  (drafts: CurrentUpload[]) => {
    return drafts.map((d) => d.name);
  }
);
