import { createSelector } from "reselect";

import { NOTES_ANNOTATION_NAME, WELL_ANNOTATION_NAME } from "../../constants";
import {
  Annotation,
  AnnotationOption,
  AnnotationType,
  ColumnType,
  LabkeyPlateResponse,
} from "../../services/labkey-client/types";
import { AnnotationWithOptions } from "../template/types";
import { BarcodeSelectorOption, State } from "../types";

// BASIC SELECTORS
export const getMetadata = (state: State) => state.metadata;
export const getAnnotationIdToHasBeenUsed = (state: State) =>
  state.metadata.annotationIdToHasBeenUsed;
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
export const getUploadHistory = (state: State) => state.metadata.history.upload;
export const getBarcodeSearchResults = (state: State) =>
  state.metadata.barcodeSearchResults;
export const getTemplates = (state: State) => state.metadata.templates;
export const getChannels = (state: State) => state.metadata.channels;
export const getFileMetadataForJob = (state: State) =>
  state.metadata.fileMetadataForJob;
export const getCurrentUploadFilePath = (state: State) =>
  state.metadata.currentUploadFilePath;
export const getOriginalUpload = (state: State) =>
  state.metadata.originalUpload;

// Some annotations are used purely for displaying data in the File Explorer, here we exclude those
export const getAnnotations = createSelector(
  [getAllAnnotations],
  (allAnnotations: Annotation[]): Annotation[] =>
    allAnnotations.filter((annotation) => annotation.exposeToFileUploadApp)
);

// COMPOSED SELECTORS
export const getUniqueBarcodeSearchResults = createSelector(
  [getBarcodeSearchResults],
  (allPlates: LabkeyPlateResponse[]): BarcodeSelectorOption[] => {
    return allPlates.map((plate) => {
      const imagingSessionIds = allPlates
        .filter((otherPlate) => otherPlate.barcode === plate.barcode)
        .map((p) => p.imagingSessionId);
      const barcodeDisplayString = plate.imagingSession
        ? `${plate.barcode} - ${plate.imagingSession}`
        : plate.barcode;
      return {
        barcode: barcodeDisplayString,
        imagingSessionIds,
      };
    });
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
export const getDurationAnnotationTypeId = getAnnotationTypeId(
  ColumnType.DURATION
);
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

export const getAnnotationsWithAnnotationOptions = createSelector(
  [getAnnotations, getAnnotationOptions],
  (
    annotations: Annotation[],
    annotationOptions: AnnotationOption[]
  ): AnnotationWithOptions[] => {
    return annotations
      .map((a) => {
        const options = annotationOptions
          .filter((o) => o.annotationId === a.annotationId)
          .map((o) => o.value);
        return {
          ...a,
          annotationOptions: options.length ? options : undefined,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
);
