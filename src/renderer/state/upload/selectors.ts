import { basename, extname } from "path";

import {
  castArray,
  difference,
  flatMap,
  forEach,
  groupBy,
  isArray,
  isEmpty,
  isEqual,
  isNil,
  keys,
  omit,
  reduce,
  uniq,
  values,
  without,
} from "lodash";
import { isDate } from "moment";
import * as moment from "moment";
import { createSelector } from "reselect";

import {
  CHANNEL_ANNOTATION_NAME,
  DAY_AS_MS,
  HOUR_AS_MS,
  LIST_DELIMITER_SPLIT,
  MINUTE_AS_MS,
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
} from "../../constants";
import {
  UploadMetadata as AicsFilesUploadMetadata,
} from "../../services/file-management-system/util";
import { JSSJob } from "../../services/job-status-client/types";
import { ColumnType, ImagingSession } from "../../services/labkey-client/types";
import { PlateResponse, WellResponse } from "../../services/mms-client/types";
import { Duration } from "../../types";
import { getWellLabelAndImagingSessionName, titleCase } from "../../util";
import {
  getBooleanAnnotationTypeId,
  getDateAnnotationTypeId,
  getDateTimeAnnotationTypeId,
  getDropdownAnnotationTypeId,
  getDurationAnnotationTypeId,
  getImagingSessions,
  getLookupAnnotationTypeId,
  getNumberAnnotationTypeId,
  getOriginalUpload,
  getTextAnnotationTypeId,
} from "../metadata/selectors";
import {
  getAllPlates,
  getSelectedBarcode,
  getSelectedJob,
  getWellIdToWellMap,
} from "../selection/selectors";
import { getCompleteAppliedTemplate } from "../template/selectors";
import {
  TemplateAnnotationWithTypeName,
  TemplateWithTypeNames,
} from "../template/types";
import { State, UploadMetadata, UploadStateBranch } from "../types";

import { isChannelOnlyRow, isFileRow, isSubImageRow } from "./constants";
import {
  DisplayUploadStateBranch,
  FileType,
  MMSAnnotationValueRequest,
  UploadJobTableRow,
  UploadMetadataWithDisplayFields,
} from "./types";

export const getUpload = (state: State) => state.upload.present;
export const getCurrentUploadIndex = (state: State) => state.upload.index;
export const getUploadPast = (state: State) => state.upload.past;
export const getUploadFuture = (state: State) => state.upload.future;

export const getCanRedoUpload = createSelector(
  [getUploadFuture],
  (future: UploadStateBranch[]) => {
    return !isEmpty(future);
  }
);

export const getCanUndoUpload = createSelector(
  [getCurrentUploadIndex],
  (currentUploadIndex) => {
    return currentUploadIndex > 0;
  }
);

const EXCLUDED_UPLOAD_FIELDS = [
  "file",
  "key",
  "positionIndex",
  "scene",
  "subImageName",
];

// this matches the metadata annotations to the ones in the database and removes
// extra stuff that does not have annotations associated with it but is needed for UI display
const standardizeUploadMetadata = (metadata: UploadMetadata) => {
  const strippedMetadata = omit(metadata, EXCLUDED_UPLOAD_FIELDS);
  const result: any = {};
  forEach(strippedMetadata, (value: any, key: string) => {
    result[titleCase(key)] = value;
  });

  return result;
};

export const getUploadWithCalculatedData = createSelector(
  [getUpload, getImagingSessions, getAllPlates, getWellIdToWellMap],
  (
    uploads: UploadStateBranch,
    imagingSessions: ImagingSession[],
    selectedPlates: PlateResponse[],
    wellIdToWell: Map<number, WellResponse>
  ): DisplayUploadStateBranch => {
    return reduce(
      uploads,
      (
        accum: DisplayUploadStateBranch,
        metadata: UploadMetadata,
        key: string
      ) => {
        const wellIds = metadata[WELL_ANNOTATION_NAME];
        const wellLabels = (wellIds || []).map((wellId: number) =>
          getWellLabelAndImagingSessionName(
            wellId,
            imagingSessions,
            selectedPlates,
            wellIdToWell
          )
        );
        return {
          ...accum,
          [key]: {
            ...metadata,
            wellLabels,
          },
        };
      },
      {}
    );
  }
);

const convertToUploadJobRow = (
  metadata: UploadMetadataWithDisplayFields,
  subRows: UploadJobTableRow[] = [],
  channelIds: string[] = [],
  positionIndexes: number[] = [],
  scenes: number[] = [],
  subImageNames: string[] = []
): UploadJobTableRow => {
  return {
    ...metadata,
    subRows,
    [CHANNEL_ANNOTATION_NAME]: channelIds,
    [NOTES_ANNOTATION_NAME]: metadata[NOTES_ANNOTATION_NAME]
      ? metadata[NOTES_ANNOTATION_NAME][0]
      : undefined,
    [WELL_ANNOTATION_NAME]: metadata[WELL_ANNOTATION_NAME] || [],
    positionIndexes,
    scenes,
    subImageNames,
    wellLabels: metadata.wellLabels ? metadata.wellLabels.sort() : [],
  };
};

// there will be metadata for files, each subImage in a file, each channel in a file, and every combo
// of subImages + channels
const getFileToMetadataMap = createSelector(
  [getUploadWithCalculatedData],
  (
    uploads: DisplayUploadStateBranch
  ): { [file: string]: UploadMetadataWithDisplayFields[] } => {
    return groupBy(
      values(uploads),
      ({ file }: UploadMetadataWithDisplayFields) => file
    );
  }
);

const getChannelOnlyRows = (
  allMetadataForFile: UploadMetadataWithDisplayFields[]
) => {
  const channelMetadata = allMetadataForFile.filter(isChannelOnlyRow);
  return channelMetadata.map((c) => convertToUploadJobRow(c));
};

const getSubImageChannelRows = (
  allMetadataForSubImage: UploadMetadataWithDisplayFields[],
  subImageParentMetadata?: UploadMetadataWithDisplayFields
) => {
  const sceneChannelMetadata = subImageParentMetadata
    ? without(allMetadataForSubImage, subImageParentMetadata)
    : allMetadataForSubImage;
  return sceneChannelMetadata.map((s) => convertToUploadJobRow(s));
};

const getSubImageRows = (
  allMetadataForFile: UploadMetadataWithDisplayFields[]
) => {
  const subImageRows: UploadJobTableRow[] = [];
  const subImageMetadata = allMetadataForFile.filter(isSubImageRow);
  const metadataGroupedBySubImage = groupBy(
    subImageMetadata,
    ({ positionIndex, scene, subImageName }: UploadMetadataWithDisplayFields) =>
      positionIndex || scene || subImageName
  );

  forEach(
    values(metadataGroupedBySubImage),
    (allMetadataForSubImage: UploadMetadataWithDisplayFields[]) => {
      const subImageOnlyMetadata = allMetadataForSubImage.find((m) =>
        isNil(m.channel)
      );
      if (subImageOnlyMetadata) {
        const subImageRow = convertToUploadJobRow(
          subImageOnlyMetadata,
          getSubImageChannelRows(allMetadataForSubImage, subImageOnlyMetadata)
        );
        subImageRows.push(subImageRow);
      } else {
        subImageRows.push(
          ...getSubImageChannelRows(
            allMetadataForSubImage,
            subImageOnlyMetadata
          )
        );
      }
    }
  );

  return subImageRows;
};

// Maps UploadMetadata to shape of data needed by react-table
// including information about how to display subrows
export const getUploadAsTableRows = createSelector(
  [getFileToMetadataMap],
  (metadataGroupedByFile): UploadJobTableRow[] => {
    return Object.values(metadataGroupedByFile).flatMap(
      (allMetadataForFile) => {
        const fileMetadata = allMetadataForFile.find(isFileRow);
        const channelRows = getChannelOnlyRows(allMetadataForFile);
        const subImageRows = getSubImageRows(allMetadataForFile);

        if (!fileMetadata) {
          return [...channelRows, ...subImageRows];
        }

        const allChannelIds = uniq(
          allMetadataForFile
            .filter((m) => !!m.channelId)
            .map((m) => m.channelId) as string[]
        );
        const allPositionIndexes: number[] = uniq(
          allMetadataForFile
            .filter((m) => !isNil(m.positionIndex))
            .map((m) => m.positionIndex) as number[]
        );
        const allScenes: number[] = uniq(
          allMetadataForFile
            .filter((m) => !isNil(m.scene))
            .map((m) => m.scene) as number[]
        );
        const allSubImageNames: string[] = uniq(
          allMetadataForFile
            .filter((m) => !isNil(m.subImageName))
            .map((m) => m.subImageName) as string[]
        );
        return [
          convertToUploadJobRow(
            fileMetadata,
            [...channelRows, ...subImageRows],
            allChannelIds,
            allPositionIndexes,
            allScenes,
            allSubImageNames
          ),
        ];
      }
    );
  }
);

export const getFileToAnnotationHasValueMap = createSelector(
  [getFileToMetadataMap],
  (metadataGroupedByFile: { [file: string]: UploadMetadata[] }) => {
    const result: { [file: string]: { [key: string]: boolean } } = {};
    forEach(
      metadataGroupedByFile,
      (allMetadata: UploadMetadata[], file: string) => {
        result[file] = allMetadata.reduce(
          (accum: { [key: string]: boolean }, curr: UploadMetadata) => {
            forEach(curr, (value: any, key: string) => {
              const currentValueIsEmpty = isArray(value)
                ? isEmpty(value)
                : isNil(value);
              accum[key] = accum[key] || !currentValueIsEmpty;
            });

            return accum;
          },
          {}
        );
      }
    );
    return result;
  }
);

export const getUploadKeyToAnnotationErrorMap = createSelector(
  [
    getUpload,
    getDropdownAnnotationTypeId,
    getLookupAnnotationTypeId,
    getBooleanAnnotationTypeId,
    getNumberAnnotationTypeId,
    getTextAnnotationTypeId,
    getDurationAnnotationTypeId,
    getDateAnnotationTypeId,
    getDateTimeAnnotationTypeId,
    getCompleteAppliedTemplate,
  ],
  (
    upload: UploadStateBranch,
    dropdownAnnotationTypeId?: number,
    lookupAnnotationTypeId?: number,
    booleanAnnotationTypeId?: number,
    numberAnnotationTypeId?: number,
    textAnnotationTypeId?: number,
    durationAnnotationTypeId?: number,
    dateAnnotationTypeId?: number,
    dateTimeAnnotationTypeId?: number,
    template?: TemplateWithTypeNames
  ): { [key: string]: { [annotation: string]: string } } => {
    if (!template) {
      return {};
    }

    const result: any = {};
    forEach(upload, (metadata: UploadMetadata, key: string) => {
      const annotationToErrorMap: { [annotation: string]: string } = {};
      forEach(
        standardizeUploadMetadata(metadata),
        (value: any, annotationName: string) => {
          const templateAnnotation = template.annotations.find(
            (a) => a.name === annotationName
          );
          if (!isNil(value) && templateAnnotation) {
            if (!Array.isArray(value)) {
              annotationToErrorMap[annotationName] =
                "Invalid format, expected list";
            } else {
              value = castArray(value);
              let invalidValues;
              switch (templateAnnotation.annotationTypeId) {
                case dropdownAnnotationTypeId:
                case lookupAnnotationTypeId:
                  if (templateAnnotation.annotationOptions) {
                    invalidValues = difference(
                      value,
                      templateAnnotation.annotationOptions
                    ).join(", ");
                    if (invalidValues) {
                      const expected = templateAnnotation.annotationOptions.join(
                        ", "
                      );
                      annotationToErrorMap[
                        annotationName
                      ] = `${invalidValues} did not match any of the expected values: ${expected}`;
                    }
                  }
                  break;
                case booleanAnnotationTypeId:
                  invalidValues = value
                    .filter((v: any) => typeof v !== "boolean")
                    .join(", ");
                  if (invalidValues) {
                    annotationToErrorMap[
                      annotationName
                    ] = `${invalidValues} did not match expected type: YesNo`;
                  }
                  break;
                case numberAnnotationTypeId:
                  if (
                    value.length > 0 &&
                    `${value[0]}`.trim().endsWith(LIST_DELIMITER_SPLIT)
                  ) {
                    annotationToErrorMap[annotationName] =
                      "value cannot end with a comma";
                  } else {
                    invalidValues = value
                      .filter((v: any) => typeof v !== "number")
                      .join(", ");
                    if (invalidValues) {
                      annotationToErrorMap[
                        annotationName
                      ] = `${invalidValues} did not match expected type: Number`;
                    }
                  }

                  break;
                case textAnnotationTypeId:
                  if (
                    value.length > 0 &&
                    `${value[0]}`.trim().endsWith(LIST_DELIMITER_SPLIT)
                  ) {
                    annotationToErrorMap[annotationName] =
                      "value cannot end with a comma";
                  } else {
                    invalidValues = value
                      .filter((v: any) => typeof v !== "string")
                      .join(", ");
                    if (invalidValues) {
                      annotationToErrorMap[
                        annotationName
                      ] = `${invalidValues} did not match expected type: Text`;
                    }
                  }
                  break;
                case durationAnnotationTypeId:
                  if (value.length > 1) {
                    annotationToErrorMap[
                      annotationName
                    ] = `Only one Duration value may be present`;
                  } else if (value.length === 1) {
                    const {
                      days,
                      hours,
                      minutes,
                      seconds,
                    } = value[0] as Duration;

                    if (
                      [days, hours, minutes, seconds].some(
                        (v) => typeof v !== "number" || v < 0
                      )
                    ) {
                      annotationToErrorMap[
                        annotationName
                      ] = `A Duration may only include numbers greater than 0`;
                    }
                  }
                  break;
                case dateTimeAnnotationTypeId:
                case dateAnnotationTypeId:
                  invalidValues = value
                    .filter((v: any) => !isDate(v))
                    .join(", ");
                  if (invalidValues) {
                    annotationToErrorMap[
                      annotationName
                    ] = `${invalidValues} did not match expected type: Date or DateTime`;
                  }
                  break;
                default:
                  annotationToErrorMap[annotationName] = "Unexpected data type";
                  break;
              }
            }
          }
        }
      );

      if (keys(annotationToErrorMap).length) {
        result[key] = annotationToErrorMap;
      }
    });
    return result;
  }
);

/**
 * This selector validates that a template has been selected, there are uploads,
 * and enforces that each file in an upload batch:
 *    - have a well id defined if user has not explicitly noted
 *      that they do not have a plate
 *    - have values for all annotations required by template
 *    - have values for annotations that match the expected type
 */
export const getUploadValidationErrors = createSelector(
  [
    getUploadAsTableRows,
    getFileToAnnotationHasValueMap,
    getUploadKeyToAnnotationErrorMap,
    getCompleteAppliedTemplate,
    getSelectedBarcode,
  ],
  (
    rows: UploadJobTableRow[],
    fileToAnnotationHasValueMap: { [file: string]: { [key: string]: boolean } },
    validationErrorsMap: { [key: string]: { [annotation: string]: string } },
    template?: TemplateWithTypeNames,
    selectedBarcode?: string
  ): string[] => {
    if (!template) {
      return [];
    }
    const errors: string[] = [];
    const shouldHaveWells = Boolean(selectedBarcode);
    // Iterate over each row value adding an error for each value with a non-ASCII character
    rows.forEach((row) => {
      Object.entries(row).forEach(([rowKey, rowValue]) => {
        const rowValues = isArray(rowValue) ? rowValue : [rowValue];
        rowValues.forEach((individualRowValue) => {
          // Checks if the value has any non-ASCII characters
          if (
            typeof individualRowValue === "string" &&
            /[^\0-\x7F]/.exec(individualRowValue)
          ) {
            errors.push(
              `Annotations cannot have special characters like in "${individualRowValue}" for ${rowKey}`
            );
          }
        });
      });
    });
    const requiredAnnotations = template.annotations
      .filter((a) => a.required)
      .map((a) => a.name);
    forEach(
      fileToAnnotationHasValueMap,
      (annotationHasValueMap: { [key: string]: boolean }, file: string) => {
        const fileName = basename(file);
        const requiredAnnotationsThatDontHaveValues = requiredAnnotations.filter(
          (annotation) => !annotationHasValueMap[annotation]
        );
        if (!annotationHasValueMap[WELL_ANNOTATION_NAME] && shouldHaveWells) {
          requiredAnnotationsThatDontHaveValues.push(WELL_ANNOTATION_NAME);
        }

        if (requiredAnnotationsThatDontHaveValues.length) {
          const requiredAnnotationsMissingNames = requiredAnnotationsThatDontHaveValues.join(
            ", "
          );
          errors.push(
            `"${fileName}" is missing the following required annotations: ${requiredAnnotationsMissingNames}`
          );
        }
      }
    );

    if (keys(validationErrorsMap).length) {
      errors.push(
        "Unexpected format for annotation type. Hover red x icons for more information."
      );
    }

    return errors;
  }
);

// the userData relates to the same file but differs for subimage/channel combinations
const getAnnotations = (
  metadata: UploadMetadata[],
  appliedTemplate: TemplateWithTypeNames
): MMSAnnotationValueRequest[] => {
  const annotationNameToAnnotationMap: {
    [name: string]: TemplateAnnotationWithTypeName;
  } = appliedTemplate.annotations.reduce(
    (accum, annotation) => ({
      ...accum,
      [annotation.name]: annotation,
    }),
    {}
  );
  return flatMap(metadata, (metadatum: UploadMetadata) => {
    const customData = standardizeUploadMetadata(metadatum);
    const result: MMSAnnotationValueRequest[] = [];
    forEach(customData, (value: any, annotationName: string) => {
      annotationName = titleCase(annotationName);
      const annotation = annotationNameToAnnotationMap[annotationName];
      if (annotation) {
        let addAnnotation = Array.isArray(value)
          ? !isEmpty(value)
          : !isNil(value);
        if (annotation.type === ColumnType.BOOLEAN) {
          addAnnotation = annotation.type === ColumnType.BOOLEAN;
          if (isEmpty(value)) {
            value = [false];
          }
        }

        if (addAnnotation) {
          result.push({
            annotationId: annotation.annotationId,
            channelId: metadatum.channelId,
            positionIndex: metadatum.positionIndex,
            scene: metadatum.scene,
            subImageName: metadatum.subImageName,
            values: castArray(value).map((v) => {
              if (annotation.type === ColumnType.DATETIME) {
                return moment(v).format("YYYY-MM-DD HH:mm:ss");
              } else if (annotation.type === ColumnType.DATE) {
                return moment(v).format("YYYY-MM-DD");
              } else if (annotation.type === ColumnType.DURATION) {
                const { days, hours, minutes, seconds } = v as Duration;
                return (
                  days * DAY_AS_MS +
                  hours * HOUR_AS_MS +
                  minutes * MINUTE_AS_MS +
                  seconds * 1000
                ).toString();
              }
              return v.toString();
            }),
          });
        }
      } else {
        // tslint:disable-next-line
        console.warn(
          `Found annotation named ${annotationName} that is not in template`
        );
      }
    });
    return result;
  });
};

const extensionToFileTypeMap: { [index: string]: FileType } = {
  ".csv": FileType.CSV,
  ".czexp": FileType.ZEISS_CONFIG_FILE,
  ".czi": FileType.IMAGE,
  ".czmbi": FileType.ZEISS_CONFIG_FILE,
  ".czsh": FileType.ZEISS_CONFIG_FILE,
  ".gif": FileType.IMAGE,
  ".jpeg": FileType.IMAGE,
  ".jpg": FileType.IMAGE,
  ".pdf": FileType.IMAGE, // TODO: decide if we consider this to be true
  ".png": FileType.IMAGE,
  ".tif": FileType.IMAGE,
  ".tiff": FileType.IMAGE,
  ".txt": FileType.TEXT,
};

export const getUploadPayload = createSelector(
  [getUpload, getCompleteAppliedTemplate],
  (uploads: UploadStateBranch, template?: TemplateWithTypeNames): Uploads => {
    if (!template) {
      throw new Error("Template has not been applied");
    }

    let result = {};
    const metadataGroupedByFile = groupBy(values(uploads), "file");
    forEach(
      metadataGroupedByFile,
      (metadata: UploadMetadata[], fullPath: string) => {
        // to support the current way of storing metadata in bob the blob, we continue to include
        // wellIds in the microscopy block. Since a file may have 1 or more scenes and channels
        // per file, we set these values to a uniq list of all of the values found across each "dimension"
        const wellIds = uniq(
          flatMap(metadata, (m) => m[WELL_ANNOTATION_NAME] || [])
        ).filter((w) => !!w);
        const fileKey = metadata[0]?.fileId || fullPath;
        result = {
          ...result,
          [fileKey]: {
            customMetadata: {
              annotations: getAnnotations(metadata, template),
              templateId: template.templateId,
            },
            file: {
              disposition: "tape", // prevent czi -> ome.tiff conversions
              ...(metadata[0]?.fileId && { fileId: metadata[0]?.fileId }),
              fileType:
                extensionToFileTypeMap[extname(fullPath).toLowerCase()] ||
                FileType.OTHER,
              originalPath: fullPath,
              shouldBeInArchive: true,
              shouldBeInLocal: true,
            },
            microscopy: {
              ...(wellIds.length && { wellIds }),
            },
          },
        };
      }
    );

    return result;
  }
);

export const getUploadFileNames = createSelector(
  [getUpload],
  (upload: UploadStateBranch): string[] =>
    uniq(
      Object.values(upload).map(({ file }: UploadMetadata) => basename(file))
    ).sort()
);

export const getCanSaveUploadDraft = createSelector(
  [getUpload, getOriginalUpload],
  (upload: UploadStateBranch, originalUpload?: UploadStateBranch) => {
    if (!originalUpload) {
      return !isEmpty(upload);
    }
    return !isEqual(originalUpload, upload);
  }
);

export const getFileIdsFromUploads = createSelector(
  [getUpload],
  (upload: UploadStateBranch) => {
    return values(upload).map((u) => u.fileId);
  }
);

// returns files that were on the selected job that are no longer there
export const getFileIdsToDelete = createSelector(
  [getFileIdsFromUploads, getSelectedJob],
  (uploadFileIds: string[], selectedJob?: JSSJob): string[] => {
    if (!selectedJob) {
      return [];
    }
    const selectedJobFileIds: string[] = selectedJob.serviceFields.result.map(
      ({ fileId }: UploadMetadata) => fileId
    );
    return difference(selectedJobFileIds, uploadFileIds);
  }
);

export const getEditFileMetadataRequests = createSelector(
  [getUploadPayload],
  (
    uploads: Uploads
  ): Array<{ fileId: string; request: AicsFilesUploadMetadata }> => {
    const result: Array<{
      fileId: string;
      request: AicsFilesUploadMetadata;
    }> = [];
    forEach(uploads, (request: AicsFilesUploadMetadata, fileId: string) => {
      result.push({
        fileId,
        request,
      });
    });
    return result;
  }
);
