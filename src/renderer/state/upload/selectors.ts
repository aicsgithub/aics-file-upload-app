import { Uploads } from "@aics/aicsfiles/type-declarations/types";
import {
    castArray,
    difference,
    flatMap,
    forEach,
    groupBy,
    isArray,
    isEmpty,
    isNil,
    keys,
    omit,
    pick,
    reduce,
    some,
    uniq,
    values,
    without,
} from "lodash";
import { isDate } from "moment";
import * as moment from "moment";
import { basename, extname } from "path";
import { createSelector } from "reselect";

import { LIST_DELIMITER_JOIN } from "../../constants";
import { getWellLabel, titleCase } from "../../util";
import {
    getBooleanAnnotationTypeId,
    getDateAnnotationTypeId,
    getDateTimeAnnotationTypeId,
    getDropdownAnnotationTypeId,
    getImagingSessions,
    getLookupAnnotationTypeId,
    getNumberAnnotationTypeId,
    getTextAnnotationTypeId,
} from "../metadata/selectors";
import { ImagingSession } from "../metadata/types";
import { getAllPlates, getAllWells, getExpandedUploadJobRows } from "../selection/selectors";

import { ExpandedRows, PlateResponse, WellResponse } from "../selection/types";
import { getCompleteAppliedTemplate } from "../template/selectors";
import { ColumnType, TemplateWithTypeNames } from "../template/types";
import { State } from "../types";
import { getUploadRowKey, isChannelOnlyRow, isFileRow, isSceneOnlyRow, isSceneRow } from "./constants";
import {
    DisplayUploadStateBranch,
    FilepathToBoolean,
    FileType,
    MMSAnnotationValueRequest,
    UploadJobTableRow,
    UploadMetadata,
    UploadMetadataWithDisplayFields,
    UploadStateBranch,
} from "./types";

export const getUpload = (state: State) => state.upload.present;
export const getCurrentUploadIndex = (state: State) => state.upload.index;
export const getUploadPast = (state: State) => state.upload.past;
export const getUploadFuture = (state: State) => state.upload.future;

export const getAppliedTemplateId = createSelector([getUpload], (uploads: UploadStateBranch): number | undefined =>
    Object.keys(uploads).length ? uploads[Object.keys(uploads)[0]].templateId : undefined
);

export const getCanRedoUpload = createSelector([getUploadFuture], (future: UploadStateBranch[]) => {
    return !isEmpty(future);
});

export const getCanUndoUpload = createSelector([getUploadPast], (past: UploadStateBranch[]) => {
    return !isEmpty(past);
});

const EXCLUDED_UPLOAD_FIELDS = [
    "barcode",
    "channel",
    "file",
    "key",
    "plateId",
    "positionIndex",
    "shouldBeInArchive",
    "shouldBeInLocal",
    "templateId",
    "wellLabels",
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
    wells: WellResponse[]
) => {
    const well = wells.find((w) => w.wellId === wellId);
    let label = "ERROR";
    if (well) {
        label = getWellLabel({col: well.col, row: well.row});
        const plate = selectedPlates.find((p) => p.plateId === well.plateId);

        if (plate && plate.imagingSessionId) {
            const imagingSession = imagingSessions
                .find((is) => is.imagingSessionId === plate.imagingSessionId);
            if (imagingSession) {
                label += ` (${imagingSession.name})`;
            }
        }
    }
    return label;
};

export const getUploadWithCalculatedData = createSelector([
    getUpload,
    getImagingSessions,
    getAllPlates,
    getAllWells,
], (
    uploads: UploadStateBranch,
    imagingSessions: ImagingSession[],
    selectedPlates: PlateResponse[],
    wells: WellResponse[]
): DisplayUploadStateBranch => {
    return reduce(uploads, (accum: DisplayUploadStateBranch, metadata: UploadMetadata, key: string) => {
        const { wellIds } = metadata;
        const wellLabels = (wellIds || []).map((wellId: number) =>
            getWellLabelAndImagingSessionName(wellId, imagingSessions, selectedPlates, wells));
        return {
            ...accum,
            [key]: {
                ...metadata,
                wellLabels,
            },
        };
    }, {});
});

const convertToUploadJobRow = (
    metadata: UploadMetadataWithDisplayFields,
    numberSiblings: number,
    siblingIndex: number,
    treeDepth: number,
    template?: TemplateWithTypeNames,
    hasSubRows: boolean = false,
    channelIds: number[] = [],
    positionIndexes: number[] = [],
    scenes: number[] = [],
    subImageNames: string[] = []
): UploadJobTableRow => {
    // convert arrays to strings
    const formattedMetadata: UploadMetadataWithDisplayFields = {...metadata};
    if (template) {
        forEach(standardizeUploadMetadata(metadata), (value: any, key: string) => {
            const templateAnnotation = template.annotations.find((a) => a.name === key);

            if (!templateAnnotation) {
                throw new Error("Could not get template annotation named " + key);
            }

            const { type } = templateAnnotation;
            // When a text or number annotation has supports multiple values, the editor will be
            // an Input so we need to convert arrays to strings
            const formatList = templateAnnotation && templateAnnotation.canHaveManyValues && Array.isArray(value) &&
                (type === ColumnType.TEXT || type === ColumnType.NUMBER);
            if (formatList) {
                formattedMetadata[key] = value.join(LIST_DELIMITER_JOIN);
            }
        });
    }

    return {
        ...formattedMetadata,
        channelIds,
        group: hasSubRows,
        key: getUploadRowKey(metadata.file, metadata.positionIndex,
            metadata.channel ? metadata.channel.channelId : undefined),
        numberSiblings,
        positionIndexes,
        scenes,
        siblingIndex,
        subImageNames,
        treeDepth,
        wellLabels: metadata.wellLabels ? metadata.wellLabels.sort().join(LIST_DELIMITER_JOIN) : "",
        workflows: metadata.workflows ? metadata.workflows.join(LIST_DELIMITER_JOIN) : "",
    };
};

// there will be metadata for files, each scene in a file, each channel in a file, and every combo
// of scenes + channels
const getFileToMetadataMap = createSelector([
    getUploadWithCalculatedData,
], (uploads: DisplayUploadStateBranch): { [file: string]: UploadMetadataWithDisplayFields[] } => {
    return groupBy(values(uploads), ({file}: UploadMetadataWithDisplayFields) => file);
});

const getChannelOnlyRows = (allMetadataForFile: UploadMetadataWithDisplayFields[], template?: TemplateWithTypeNames,
                            treeDepth: number = 1) => {
    const channelMetadata = allMetadataForFile.filter(isChannelOnlyRow);
    const sceneOnlyRows = allMetadataForFile.filter(isSceneOnlyRow);
    return channelMetadata.map((c: UploadMetadataWithDisplayFields, siblingIndex: number) =>
        convertToUploadJobRow(
            c,
            channelMetadata.length + sceneOnlyRows.length,
            siblingIndex,
            treeDepth,
            template
        ));
};

const getSceneChannelRows = (allMetadataForPositionIndex: UploadMetadataWithDisplayFields[],
                             treeDepth: number,
                             sceneParentMetadata?: UploadMetadataWithDisplayFields,
                             template?: TemplateWithTypeNames) => {
    const sceneChannelMetadata = sceneParentMetadata ? without(allMetadataForPositionIndex, sceneParentMetadata)
        : allMetadataForPositionIndex;
    return sceneChannelMetadata
        .map((u: UploadMetadataWithDisplayFields, sceneChannelSiblingIndex: number) =>
            convertToUploadJobRow(u, sceneChannelMetadata.length,
                sceneChannelSiblingIndex, treeDepth, template));
};

const getSceneRows = (allMetadataForFile: UploadMetadataWithDisplayFields[],
                      numberChannelOnlyRows: number,
                      expandedRows: ExpandedRows, file: string,
                      sceneRowTreeDepth: number,
                      template?: TemplateWithTypeNames
                      ) => {
    const sceneRows: UploadJobTableRow[] = [];
    const sceneMetadata = allMetadataForFile.filter(isSceneRow);
    const metadataGroupedByScene = groupBy(
        sceneMetadata,
        ({positionIndex}: UploadMetadataWithDisplayFields) => positionIndex
    );
    const numberSiblingsUnderFile = numberChannelOnlyRows + keys(metadataGroupedByScene).length;

    forEach(values(metadataGroupedByScene),
        (allMetadataForPositionIndex: UploadMetadataWithDisplayFields[], sceneIndex: number) => {
            const sceneParentMetadata = allMetadataForPositionIndex.find((m) => isNil(m.channel));
            if (sceneParentMetadata) {
                const sceneRow = convertToUploadJobRow(
                    sceneParentMetadata,
                    numberSiblingsUnderFile,
                    sceneIndex + numberChannelOnlyRows,
                    sceneRowTreeDepth,
                    template,
                    allMetadataForPositionIndex.length > 1
                );
                sceneRows.push(sceneRow);

                if (expandedRows[getUploadRowKey(file, sceneParentMetadata.positionIndex)]) {
                    sceneRows.push(...getSceneChannelRows(allMetadataForPositionIndex, sceneRowTreeDepth + 1,
                        sceneParentMetadata, template));
                }
            } else {
                sceneRows.push(...getSceneChannelRows(allMetadataForPositionIndex, sceneRowTreeDepth,
                    sceneParentMetadata, template));
            }
        });

    return sceneRows;
};

// maps uploadMetadata to shape of data needed by react-data-grid including information about how to display subrows
export const getUploadSummaryRows = createSelector([
    getUploadWithCalculatedData,
    getExpandedUploadJobRows,
    getFileToMetadataMap,
    getCompleteAppliedTemplate,
], (uploads: DisplayUploadStateBranch, expandedRows: ExpandedRows,
    metadataGroupedByFile: { [file: string]: UploadMetadataWithDisplayFields[] },
    template?: TemplateWithTypeNames): UploadJobTableRow[] => {
    // contains only rows that are visible (i.e. rows whose parents are expanded)
    const visibleRows: UploadJobTableRow[] = [];

    // populate visibleRows
    let fileSiblingIndex = -1;
    forEach(metadataGroupedByFile, (allMetadataForFile: UploadMetadataWithDisplayFields[], file: string) => {
        fileSiblingIndex++;
        const fileMetadata = allMetadataForFile.find(isFileRow);
        const treeDepth = fileMetadata ? 1 : 0;
        const channelRows = getChannelOnlyRows(allMetadataForFile, template, treeDepth);
        const sceneRows = getSceneRows(allMetadataForFile, channelRows.length, expandedRows, file, treeDepth, template);

        if (fileMetadata) {
            // file rows are always visible
            const hasSubRows = channelRows.length + sceneRows.length > 0;
            const allChannelIds = uniq(allMetadataForFile
                .filter((m: UploadMetadataWithDisplayFields) => !!m.channel)
                .map((m: UploadMetadataWithDisplayFields) => m.channel!.channelId));
            const allPositionIndexes: number[] = uniq(allMetadataForFile
                .filter((m: UploadMetadataWithDisplayFields) => !isNil(m.positionIndex))
                .map((m: UploadMetadataWithDisplayFields) => m.positionIndex)) as number[];
            const allScenes: number[] = uniq(allMetadataForFile
                .filter((m: UploadMetadataWithDisplayFields) => !isNil(m.scene))
                .map((m: UploadMetadataWithDisplayFields) => m.scene)
            ) as number[];
            const allSubImageNames: string[] = uniq(allMetadataForFile
                .filter((m: UploadMetadataWithDisplayFields) => !isNil(m.subImageName))
                .map((m: UploadMetadataWithDisplayFields) => m.subImageName)
            ) as string[];
            const fileRow = convertToUploadJobRow(fileMetadata, keys(metadataGroupedByFile).length, fileSiblingIndex,
                0, template, hasSubRows, allChannelIds, allPositionIndexes, allScenes, allSubImageNames);
            visibleRows.push(fileRow);

            if (expandedRows[getUploadRowKey(file)]) {
                visibleRows.push(
                    ...channelRows,
                    ...sceneRows
                );
            }
        } else {
            visibleRows.push(
                ...channelRows,
                ...sceneRows
            );
        }
    });

    return visibleRows;
});

export const getFileToAnnotationHasValueMap = createSelector([getFileToMetadataMap],
    (metadataGroupedByFile: { [file: string]: UploadMetadata[] }) => {
        const result: { [file: string]: { [key: string]: boolean } } = {};
        forEach(metadataGroupedByFile, (allMetadata: UploadMetadata[], file: string) => {
            result[file] = allMetadata.reduce((accum: { [key: string]: boolean }, curr: UploadMetadata) => {
                forEach(curr, (value: any, key: string) => {
                    const currentValueIsEmpty = isArray(value) ? isEmpty(value) : isNil(value);
                    accum[key] = accum[key] || !currentValueIsEmpty;
                });

                return accum;
            }, {});
        });
        return result;
    }
);

export const getValidationErrorsMap = createSelector([
    getUpload,
    getDropdownAnnotationTypeId,
    getLookupAnnotationTypeId,
    getBooleanAnnotationTypeId,
    getNumberAnnotationTypeId,
    getTextAnnotationTypeId,
    getDateAnnotationTypeId,
    getDateTimeAnnotationTypeId,
    getCompleteAppliedTemplate,
], (
    upload: UploadStateBranch,
    dropdownAnnotationTypeId?: number,
    lookupAnnotationTypeId?: number,
    booleanAnnotationTypeId?: number,
    numberAnnotationTypeId?: number,
    textAnnotationTypeId?: number,
    dateAnnotationTypeId?: number,
    dateTimeAnnotationTypeId?: number,
    template?: TemplateWithTypeNames): {[key: string]: {[annotation: string]: string}} => {
    if (!template) {
        return {};
    }

    const result: any = {};
    forEach(upload, (metadata: UploadMetadata, key: string) => {
        const annotationToErrorMap: {[annotation: string]: string} = {};
        forEach(standardizeUploadMetadata(metadata), (value: any, annotationName: string) => {
            const templateAnnotation = template.annotations.find((a) => a.name === annotationName);
            if (!isNil(value) && templateAnnotation) {
                if (templateAnnotation.canHaveManyValues && !Array.isArray(value)) {
                    annotationToErrorMap[annotationName] = "Invalid format, expected list";
                } else {
                    value = castArray(value);
                    let invalidValues;
                    switch (templateAnnotation.annotationTypeId) {
                        case dropdownAnnotationTypeId:
                        case lookupAnnotationTypeId:
                            if (templateAnnotation.annotationOptions) {
                                invalidValues = difference(value,
                                    templateAnnotation.annotationOptions).join(", ");
                                if (invalidValues) {
                                    const expected = templateAnnotation.annotationOptions.join(", ");
                                    annotationToErrorMap[annotationName] =
                                        `${invalidValues} did not match any of the expected values: ${expected}`;
                                }
                            }
                            break;
                        case booleanAnnotationTypeId:
                            invalidValues = value.filter((v: any) => typeof v !== "boolean").join(", ");
                            if (invalidValues) {
                                annotationToErrorMap[annotationName] =
                                    `${invalidValues} did not match expected type: Yes/No`;
                            }
                            break;
                        case numberAnnotationTypeId:
                            invalidValues = value.filter((v: any) => typeof  v !== "number").join(", ");
                            if (invalidValues) {
                                annotationToErrorMap[annotationName] =
                                    `${invalidValues} did not match expected type: Number`;
                            }
                            break;
                        case textAnnotationTypeId:
                            invalidValues = value.filter((v: any) => typeof  v !== "string").join(", ");
                            if (invalidValues) {
                                annotationToErrorMap[annotationName] =
                                    `${invalidValues} did not match expected type: Text`;
                            }
                            break;
                        case dateTimeAnnotationTypeId:
                        case dateAnnotationTypeId:
                            invalidValues = value.filter((v: any) => !isDate(v)).join(", ");
                            if (invalidValues) {
                                annotationToErrorMap[annotationName] =
                                    `${invalidValues} did not match expected type: Date or DateTime`;
                            }
                            break;
                        default:
                            annotationToErrorMap[annotationName] = "Unexpected data type";
                            break;
                    }
                }
            }
        });

        if (keys(annotationToErrorMap).length) {
            result[key] = annotationToErrorMap;
        }
    });
    return result;
});

export const getCanSave = createSelector([
    getUploadSummaryRows,
    getFileToAnnotationHasValueMap,
    getValidationErrorsMap,
    getCompleteAppliedTemplate,
], (
    rows: UploadJobTableRow[],
    fileToAnnotationHasValueMap: {[file: string]: {[key: string]: boolean}},
    validationErrorsMap: {[key: string]: {[annotation: string]: string}},
    template?: TemplateWithTypeNames
): boolean => {
    if (!template || !rows.length) {
        return false;
    }

    if (keys(validationErrorsMap).length) {
        return false;
    }

    const requiredAnnotations = template.annotations.filter((a) => a.required).map((a) => a.name);
    let isValid = true;
    forEach(fileToAnnotationHasValueMap, (annotationHasValueMap: {[key: string]: boolean}) => {
        if (!annotationHasValueMap.wellIds && !annotationHasValueMap.workflows) {
            isValid = false;
        }
        const onlyRequiredAnnotations = pick(annotationHasValueMap, requiredAnnotations);
        const valuesOfRequired = values(onlyRequiredAnnotations);
        const aFalseExists = some(valuesOfRequired, (x) => !x);
        if (aFalseExists) {
            isValid = false;
        }
    });

    return isValid;
});

// the userData relates to the same file but differs for scene/channel combinations
const getAnnotations = (
    metadata: UploadMetadata[],
    appliedTemplate: TemplateWithTypeNames
): MMSAnnotationValueRequest[] => {
    return flatMap(metadata, (metadatum: UploadMetadata) => {
        const customData = standardizeUploadMetadata(metadatum);
        const result: MMSAnnotationValueRequest[] = [];
        forEach(customData, (value: any, annotationName: string) => {
            const addAnnotation = Array.isArray(value) ? !isEmpty(value) : !isNil(value);
            if (addAnnotation) {
                annotationName = titleCase(annotationName);
                const annotation = appliedTemplate.annotations
                    .find((a) => a.name === annotationName);
                if (!annotation) {
                    throw new Error(
                        `Could not find an annotation named ${annotationName} in your template`
                    );
                }

                result.push({
                    annotationId: annotation.annotationId,
                    channelId: metadatum.channel ? metadatum.channel.channelId : undefined,
                    positionIndex: metadatum.positionIndex,
                    timePointId: undefined,
                    values: castArray(value).map((v) => {
                        if (annotation.type === ColumnType.DATETIME) {
                            return moment(v).format("YYYY-MM-DD HH:mm:ss");
                        } else if (annotation.type === ColumnType.DATE) {
                            return moment(v).format("YYYY-MM-DD");
                        }
                        return v.toString();
                    }),
                });
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

export const getUploadPayload = createSelector([
    getUpload,
    getCompleteAppliedTemplate,
], (uploads: UploadStateBranch, template?: TemplateWithTypeNames): Uploads => {
    if (!template) {
        throw new Error("Template has not been applied");
    }

    let result = {};
    const metadataGroupedByFile = groupBy(values(uploads), "file");
    forEach(metadataGroupedByFile, (metadata: UploadMetadata[], fullPath: string) => {
        // to support the current way of storing metadata in bob the blob, we continue to include
        // wellIds and workflows in the microscopy block. Since a file may have 1 or more scenes and channels
        // per file, we set these values to a uniq list of all of the values found across each "dimension"
        const wellIds = uniq(flatMap(metadata, (m) => m.wellIds)).filter((w) => !!w);
        const workflows = uniq(flatMap(metadata, (m) => m.workflows || [])).filter((w) => !!w);
        const fileRows = metadata.filter(isFileRow);
        const shouldBeInArchive = fileRows.length && !isNil(fileRows[0].shouldBeInArchive) ?
            fileRows[0].shouldBeInArchive : true;
        const shouldBeInLocal = fileRows.length && !isNil(fileRows[0].shouldBeInLocal) ?
            fileRows[0].shouldBeInLocal : true;
        result = {
            ...result,
            [fullPath]: {
                customMetadata: {
                    annotations: getAnnotations(metadata, template),
                    templateId: template.templateId,
                },
                file: {
                    fileType: extensionToFileTypeMap[extname(fullPath).toLowerCase()] || FileType.OTHER,
                    originalPath: fullPath,
                    shouldBeInArchive,
                    shouldBeInLocal,
                },
                microscopy: {
                    ...(wellIds.length && { wellIds }),
                    ...(workflows.length && { workflows }),
                },
            },
        };
    });

    return result;
});

export const getUploadFileNames = createSelector([
    getUploadPayload,
], (upload: Uploads): string => (
    Object.keys(upload).map((filePath: string) => basename(filePath)).sort().join(", ")
));

export const getUploadFiles = createSelector([
    getUpload,
], (upload: UploadStateBranch) => uniq(values(upload).map((u: UploadMetadata) => u.file)));

export const getFileToArchive = createSelector([
    getUpload,
], (upload: UploadStateBranch) =>
    values(upload)
        .filter(isFileRow)
        .reduce((accum: FilepathToBoolean, {file, shouldBeInArchive}: UploadMetadata) => ({
            ...accum,
            [file]: Boolean(shouldBeInArchive),
        }), {})
);

export const getFileToStoreOnIsilon = createSelector([
    getUpload,
], (upload: UploadStateBranch) =>
    values(upload)
        .filter(isFileRow)
        .reduce((accum: FilepathToBoolean, {file, shouldBeInLocal}: UploadMetadata) => ({
            ...accum,
            [file]: Boolean(shouldBeInLocal),
        }), {})
);

export const getCanGoForwardFromSelectStorageLocationPage = createSelector([
    getUploadFiles,
    getFileToArchive,
    getFileToStoreOnIsilon,
], (files: string[], fileToArchive: FilepathToBoolean, fileToStoreOnIsilon: FilepathToBoolean) =>
    !some(files, (f: string) => !fileToArchive[f] && !fileToStoreOnIsilon[f]));
