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
  pickBy,
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
  LIST_DELIMITER_SPLIT,
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../constants";
import {
  UploadMetadata as AicsFilesUploadMetadata,
  Uploads,
} from "../../services/aicsfiles/types";
import { JSSJob } from "../../services/job-status-client/types";
import { ColumnType, ImagingSession } from "../../services/labkey-client/types";
import { PlateResponse, WellResponse } from "../../services/mms-client/types";
import { getWellLabel, titleCase } from "../../util";
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
  getUploadHistory,
} from "../metadata/selectors";
import { pageOrder } from "../route/constants";
import { getPage } from "../route/selectors";
import {
  getAllPlates,
  getExpandedUploadJobRows,
  getSelectedJob,
  getWellIdToWellMap,
} from "../selection/selectors";
import { getCompleteAppliedTemplate } from "../template/selectors";
import {
  TemplateAnnotationWithTypeName,
  TemplateWithTypeNames,
} from "../template/types";
import {
  Duration,
  ExpandedRows,
  Page,
  State,
  UploadMetadata,
  UploadStateBranch,
} from "../types";

import {
  getUploadRowKey,
  isChannelOnlyRow,
  isFileRow,
  isSubImageOnlyRow,
  isSubImageRow,
} from "./constants";
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
  [getUploadPast, getPage, getCurrentUploadIndex, getUploadHistory],
  (past, page, currentUploadIndex, uploadHistory) => {
    if (page === Page.AddCustomData) {
      const prevPage = pageOrder[pageOrder.indexOf(Page.AddCustomData) - 1];
      // Selecting a template on the AddCustomData page will update the upload state branch and thus increment the
      // upload index. However, we do not want this to be undoable from the grid.
      return currentUploadIndex > uploadHistory[prevPage] + 1;
    }
    const prevPage = pageOrder[pageOrder.indexOf(Page.AddCustomData) - 1];
    return currentUploadIndex > uploadHistory[prevPage];
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

// This returns a human-readable version of a well using the label (e.g. "A1", "B2") and the imaging session name
export const getWellLabelAndImagingSessionName = (
  wellId: number,
  imagingSessions: ImagingSession[],
  selectedPlates: PlateResponse[],
  wellIdToWell: Map<number, WellResponse>
) => {
  const well = wellIdToWell.get(wellId);
  let label = "ERROR";
  if (well) {
    label = getWellLabel({ col: well.col, row: well.row });
    const plate = selectedPlates.find((p) => p.plateId === well.plateId);

    if (plate && plate.imagingSessionId) {
      const imagingSession = imagingSessions.find(
        (is) => is.imagingSessionId === plate.imagingSessionId
      );
      if (imagingSession) {
        label += ` (${imagingSession.name})`;
      }
    }
  }
  return label;
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
  numberSiblings: number,
  siblingIndex: number,
  treeDepth: number,
  template?: TemplateWithTypeNames,
  hasSubRows = false,
  channelIds: string[] = [],
  positionIndexes: number[] = [],
  scenes: number[] = [],
  subImageNames: string[] = []
): UploadJobTableRow => {
  return {
    ...metadata,
    [CHANNEL_ANNOTATION_NAME]: channelIds,
    group: hasSubRows,
    key: getUploadRowKey({
      channelId: metadata.channelId,
      file: metadata.file,
      positionIndex: metadata.positionIndex,
      scene: metadata.scene,
      subImageName: metadata.subImageName,
    }),
    [NOTES_ANNOTATION_NAME]: metadata[NOTES_ANNOTATION_NAME]
      ? metadata[NOTES_ANNOTATION_NAME][0]
      : undefined,
    numberSiblings,
    positionIndexes,
    scenes,
    siblingIndex,
    subImageNames,
    treeDepth,
    wellLabels: metadata.wellLabels ? metadata.wellLabels.sort() : [],
    [WORKFLOW_ANNOTATION_NAME]: metadata[WORKFLOW_ANNOTATION_NAME] || [],
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
  allMetadataForFile: UploadMetadataWithDisplayFields[],
  template?: TemplateWithTypeNames,
  treeDepth = 1
) => {
  const channelMetadata = allMetadataForFile.filter(isChannelOnlyRow);
  const subImageOnlyRows = allMetadataForFile.filter(isSubImageOnlyRow);
  return channelMetadata.map(
    (c: UploadMetadataWithDisplayFields, siblingIndex: number) =>
      convertToUploadJobRow(
        c,
        channelMetadata.length + subImageOnlyRows.length,
        siblingIndex,
        treeDepth,
        template
      )
  );
};

const getSubImageChannelRows = (
  allMetadataForSubImage: UploadMetadataWithDisplayFields[],
  treeDepth: number,
  subImageParentMetadata?: UploadMetadataWithDisplayFields,
  template?: TemplateWithTypeNames
) => {
  const sceneChannelMetadata = subImageParentMetadata
    ? without(allMetadataForSubImage, subImageParentMetadata)
    : allMetadataForSubImage;
  return sceneChannelMetadata.map(
    (u: UploadMetadataWithDisplayFields, sceneChannelSiblingIndex: number) =>
      convertToUploadJobRow(
        u,
        sceneChannelMetadata.length,
        sceneChannelSiblingIndex,
        treeDepth,
        template
      )
  );
};

const getSubImageRows = (
  allMetadataForFile: UploadMetadataWithDisplayFields[],
  numberChannelOnlyRows: number,
  expandedRows: ExpandedRows,
  file: string,
  subImageRowTreeDepth: number,
  template?: TemplateWithTypeNames
) => {
  const subImageRows: UploadJobTableRow[] = [];
  const subImageMetadata = allMetadataForFile.filter(isSubImageRow);
  const metadataGroupedBySubImage = groupBy(
    subImageMetadata,
    ({ positionIndex, scene, subImageName }: UploadMetadataWithDisplayFields) =>
      positionIndex || scene || subImageName
  );
  const numberSiblingsUnderFile =
    numberChannelOnlyRows + keys(metadataGroupedBySubImage).length;

  forEach(
    values(metadataGroupedBySubImage),
    (
      allMetadataForSubImage: UploadMetadataWithDisplayFields[],
      index: number
    ) => {
      const subImageOnlyMetadata = allMetadataForSubImage.find((m) =>
        isNil(m.channel)
      );
      if (subImageOnlyMetadata) {
        const subImageRow = convertToUploadJobRow(
          subImageOnlyMetadata,
          numberSiblingsUnderFile,
          index + numberChannelOnlyRows,
          subImageRowTreeDepth,
          template,
          allMetadataForSubImage.length > 1
        );
        subImageRows.push(subImageRow);
        if (expandedRows[subImageRow.key]) {
          subImageRows.push(
            ...getSubImageChannelRows(
              allMetadataForSubImage,
              subImageRowTreeDepth + 1,
              subImageOnlyMetadata,
              template
            )
          );
        }
      } else {
        subImageRows.push(
          ...getSubImageChannelRows(
            allMetadataForSubImage,
            subImageRowTreeDepth,
            subImageOnlyMetadata,
            template
          )
        );
      }
    }
  );

  return subImageRows;
};

// maps uploadMetadata to shape of data needed by react-data-grid including information about how to display subrows
export const getUploadSummaryRows = createSelector(
  [
    getUploadWithCalculatedData,
    getExpandedUploadJobRows,
    getFileToMetadataMap,
    getCompleteAppliedTemplate,
  ],
  (
    uploads: DisplayUploadStateBranch,
    expandedRows: ExpandedRows,
    metadataGroupedByFile: {
      [file: string]: UploadMetadataWithDisplayFields[];
    },
    template?: TemplateWithTypeNames
  ): UploadJobTableRow[] => {
    // contains only rows that are visible (i.e. rows whose parents are expanded)
    const visibleRows: UploadJobTableRow[] = [];

    // populate visibleRows
    let fileSiblingIndex = -1;
    forEach(
      metadataGroupedByFile,
      (allMetadataForFile: UploadMetadataWithDisplayFields[], file: string) => {
        fileSiblingIndex++;
        const fileMetadata = allMetadataForFile.find(isFileRow);
        const treeDepth = fileMetadata ? 1 : 0;
        const channelRows = getChannelOnlyRows(
          allMetadataForFile,
          template,
          treeDepth
        );
        const subImageRows = getSubImageRows(
          allMetadataForFile,
          channelRows.length,
          expandedRows,
          file,
          treeDepth,
          template
        );

        if (fileMetadata) {
          // file rows are always visible
          const hasSubRows = channelRows.length + subImageRows.length > 0;
          const allChannelIds = uniq(
            allMetadataForFile
              .filter((m: UploadMetadataWithDisplayFields) => !!m.channelId)
              .map(
                (m: UploadMetadataWithDisplayFields) => m.channelId
              ) as string[]
          );
          const allPositionIndexes: number[] = uniq(
            allMetadataForFile
              .filter(
                (m: UploadMetadataWithDisplayFields) => !isNil(m.positionIndex)
              )
              .map((m: UploadMetadataWithDisplayFields) => m.positionIndex)
          ) as number[];
          const allScenes: number[] = uniq(
            allMetadataForFile
              .filter((m: UploadMetadataWithDisplayFields) => !isNil(m.scene))
              .map((m: UploadMetadataWithDisplayFields) => m.scene)
          ) as number[];
          const allSubImageNames: string[] = uniq(
            allMetadataForFile
              .filter(
                (m: UploadMetadataWithDisplayFields) => !isNil(m.subImageName)
              )
              .map((m: UploadMetadataWithDisplayFields) => m.subImageName)
          ) as string[];
          const fileRow = convertToUploadJobRow(
            fileMetadata,
            keys(metadataGroupedByFile).length,
            fileSiblingIndex,
            0,
            template,
            hasSubRows,
            allChannelIds,
            allPositionIndexes,
            allScenes,
            allSubImageNames
          );
          visibleRows.push(fileRow);

          if (expandedRows[getUploadRowKey({ file })]) {
            visibleRows.push(...channelRows, ...subImageRows);
          }
        } else {
          visibleRows.push(...channelRows, ...subImageRows);
        }
      }
    );

    return visibleRows;
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
 *    - have either a well id defined OR a workflow
 *    - have values for all annotations required by template
 *    - have values for annotations that match the expected type
 */
export const getUploadValidationErrors = createSelector(
  [
    getUploadSummaryRows,
    getFileToAnnotationHasValueMap,
    getUploadKeyToAnnotationErrorMap,
    getCompleteAppliedTemplate,
    getSelectedJob,
  ],
  (
    rows: UploadJobTableRow[],
    fileToAnnotationHasValueMap: { [file: string]: { [key: string]: boolean } },
    validationErrorsMap: { [key: string]: { [annotation: string]: string } },
    template?: TemplateWithTypeNames,
    selectedJob?: JSSJob
  ): string[] => {
    const errors: string[] = [];
    if (!template) {
      errors.push("A template must be selected to submit an upload");
    } else {
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
          if (
            !annotationHasValueMap[WELL_ANNOTATION_NAME] &&
            !annotationHasValueMap[WORKFLOW_ANNOTATION_NAME]
          ) {
            errors.push(
              `${fileName} must have either a well or workflow association`
            );
          }
          const requiredAnnotationsThatDontHaveValues = keys(
            pickBy(
              annotationHasValueMap,
              (hasValue: boolean, annotationName: string) =>
                !hasValue && requiredAnnotations.includes(annotationName)
            )
          );

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
    }
    if (!rows.length && !selectedJob) {
      errors.push("No files to upload");
    }

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
                // While we may not want to rely on moment in the long-term,
                // we are already using it with dates, and it conveniently
                // can accept an object with the same shape as our`Duration`
                // type.
                return moment
                  .duration(v as Duration)
                  .asMilliseconds()
                  .toString();
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
        // wellIds and workflows in the microscopy block. Since a file may have 1 or more scenes and channels
        // per file, we set these values to a uniq list of all of the values found across each "dimension"
        const wellIds = uniq(
          flatMap(metadata, (m) => m[WELL_ANNOTATION_NAME] || [])
        ).filter((w) => !!w);
        const workflows = uniq(
          flatMap(metadata, (m) => m[WORKFLOW_ANNOTATION_NAME] || [])
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
              ...(workflows.length && { workflows }),
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
  (upload: UploadStateBranch): string =>
    uniq(
      Object.values(upload).map(({ file }: UploadMetadata) => basename(file))
    )
      .sort()
      .join(", ")
);

export const getUploadFiles = createSelector(
  [getUpload],
  (upload: UploadStateBranch) =>
    uniq(values(upload).map((u: UploadMetadata) => u.file))
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
