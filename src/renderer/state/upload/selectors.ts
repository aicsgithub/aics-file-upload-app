import { Uploads } from "@aics/aicsfiles/type-declarations/types";
import {
    castArray,
    flatMap,
    forEach,
    groupBy,
    isArray,
    isEmpty,
    isNil,
    keys,
    omit,
    pick,
    some,
    uniq,
    values,
    without
} from "lodash";
import { extname } from "path";
import { createSelector } from "reselect";
import { LIST_DELIMITER_JOIN } from "../../constants";
import { titleCase } from "../../util";

import { getUploadJobNames } from "../job/selectors";
import { getAnnotationTypes } from "../metadata/selectors";
import { getExpandedUploadJobRows, getSelectedBarcode, getSelectedWorkflows } from "../selection/selectors";

import { ExpandedRows, Workflow } from "../selection/types";
import { getCompleteAppliedTemplate } from "../template/selectors";
import { AnnotationType, ColumnType, Template } from "../template/types";
import { State } from "../types";
import { getUploadRowKey, isChannelOnlyRow, isFileRow, isSceneOnlyRow, isSceneRow } from "./constants";
import { FileType, MMSAnnotationValueRequest, UploadJobTableRow, UploadMetadata, UploadStateBranch } from "./types";

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

const convertToUploadJobRow = (
    metadata: UploadMetadata,
    numberSiblings: number,
    siblingIndex: number,
    treeDepth: number,
    template?: Template,
    annotationTypes?: AnnotationType[],
    hasSubRows: boolean = false,
    channelIds: number[] = [],
    positionIndexes: number[] = []
): UploadJobTableRow => {
    // convert arrays to strings
    const formattedMetadata: UploadMetadata = {...metadata};
    if (template && annotationTypes) {
        forEach(standardizeUploadMetadata(metadata), (value: any, key: string) => {
            const templateAnnotation = template.annotations.find((a) => a.name === key);

            if (!templateAnnotation) {
                throw new Error("Could not get template annotation named " + key);
            }

            const annotationType = annotationTypes.find((a) =>
                a.annotationTypeId === templateAnnotation.annotationTypeId);

            if (!annotationType) {
                throw new Error(
                    `Could not get annotation type for annotation ${templateAnnotation.name}. Contact Software`
                );
            }

            const type = annotationType.name;
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
        siblingIndex,
        treeDepth,
        wellLabels: metadata.wellLabels ? metadata.wellLabels.sort().join(LIST_DELIMITER_JOIN) : "",
        workflows: metadata.workflows ? metadata.workflows.join(LIST_DELIMITER_JOIN) : "",
    };
};

// there will be metadata for files, each scene in a file, each channel in a file, and every combo
// of scenes + channels
const getFileToMetadataMap = createSelector([
    getUpload,
], (uploads: UploadStateBranch): { [file: string]: UploadMetadata[] } => {
    return groupBy(values(uploads), ({file}: UploadMetadata) => file);
});

const getChannelOnlyRows = (allMetadataForFile: UploadMetadata[], template?: Template,
                            annotationTypes?: AnnotationType[]) => {
    const channelMetadata = allMetadataForFile.filter(isChannelOnlyRow);
    const sceneOnlyRows = allMetadataForFile.filter(isSceneOnlyRow);
    return channelMetadata.map((c: UploadMetadata, siblingIndex: number) =>
        convertToUploadJobRow(
            c,
            channelMetadata.length + sceneOnlyRows.length,
            siblingIndex,
            1,
            template,
            annotationTypes,
        ));
};

const getSceneRows = (allMetadataForFile: UploadMetadata[], numberChannelOnlyRows: number,
                      expandedRows: ExpandedRows, file: string, template?: Template,
                      annotationTypes?: AnnotationType[]) => {
    const sceneRows: UploadJobTableRow[] = [];
    const sceneMetadata = allMetadataForFile.filter(isSceneRow);
    const metadataGroupedByScene = groupBy(sceneMetadata, ({positionIndex}: UploadMetadata) => positionIndex);
    const numberSiblingsUnderFile = numberChannelOnlyRows + keys(metadataGroupedByScene).length;

    forEach(values(metadataGroupedByScene),
        (allMetadataForPositionIndex: UploadMetadata[], sceneIndex: number) => {
            const sceneParentMetadata = allMetadataForPositionIndex.find((m) => isNil(m.channel));
            if (sceneParentMetadata) {
                const sceneRow = convertToUploadJobRow(
                    sceneParentMetadata,
                    numberSiblingsUnderFile,
                    sceneIndex + numberChannelOnlyRows,
                    1,
                    template,
                    annotationTypes,
                    allMetadataForPositionIndex.length > 1
                );
                sceneRows.push(sceneRow);

                if (expandedRows[getUploadRowKey(file, sceneParentMetadata.positionIndex)]) {
                    const sceneChannelMetadata = without(allMetadataForPositionIndex, sceneParentMetadata);
                    const sceneChannelRows = sceneChannelMetadata
                        .map((u: UploadMetadata, sceneChannelSiblingIndex: number) =>
                            convertToUploadJobRow(u, sceneChannelMetadata.length,
                                sceneChannelSiblingIndex, 2, template));
                    sceneRows.push(...sceneChannelRows);
                }
            }
        });

    return sceneRows;
};

// maps uploadMetadata to shape of data needed by react-data-grid including information about how to display subrows
export const getUploadSummaryRows = createSelector([
    getUpload,
    getExpandedUploadJobRows,
    getFileToMetadataMap,
    getCompleteAppliedTemplate,
    getAnnotationTypes,
], (uploads: UploadStateBranch, expandedRows: ExpandedRows,
    metadataGroupedByFile: { [file: string]: UploadMetadata[] }, template?: Template,
    annotationTypes?: AnnotationType[]): UploadJobTableRow[] => {
    // contains only rows that are visible (i.e. rows whose parents are expanded)
    const visibleRows: UploadJobTableRow[] = [];

    // populate visibleRows
    let fileSiblingIndex = -1;
    forEach(metadataGroupedByFile, (allMetadataForFile: UploadMetadata[], file: string) => {
        fileSiblingIndex++;
        const fileMetadata = allMetadataForFile.find(isFileRow);

        if (fileMetadata) {
            const channelRows = getChannelOnlyRows(allMetadataForFile, template, annotationTypes);
            const sceneRows = getSceneRows(allMetadataForFile, channelRows.length, expandedRows, file, template,
                annotationTypes);

            // file rows are always visible
            const hasSubRows = channelRows.length + sceneRows.length > 0;
            const allChannelIds = uniq(allMetadataForFile
                .filter((m: UploadMetadata) => !!m.channel)
                .map((m: UploadMetadata) => m.channel!.channelId));
            const allPositionIndexes: number[] = uniq(allMetadataForFile
                .filter((m: UploadMetadata) => !isNil(m.positionIndex))
                .map((m: UploadMetadata) => m.positionIndex)) as number[];
            const fileRow = convertToUploadJobRow(fileMetadata, keys(metadataGroupedByFile).length, fileSiblingIndex,
                0, template, annotationTypes, hasSubRows, allChannelIds, allPositionIndexes);
            visibleRows.push(fileRow);

            if (expandedRows[getUploadRowKey(file)]) {
                visibleRows.push(
                    ...channelRows,
                    ...sceneRows
                );
            }
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
    getCompleteAppliedTemplate,
], (upload: UploadStateBranch, template?: Template) => {
    if (!template) {
        return {};
    }

    const result: any = {};
    forEach(upload, (metadata: UploadMetadata, key: string) => {
        const annotationToErrorMap: {[annotation: string]: string} = {};
        forEach(standardizeUploadMetadata(metadata), (value: any, annotationName: string) => {
            const templateAnnotation = template.annotations.find((a) => a.name === annotationName);
            if (templateAnnotation) {
                if (templateAnnotation.canHaveManyValues && !isNil(value) && !Array.isArray(value)) {
                    annotationToErrorMap[annotationName] = "Invalid format";
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
    template?: Template
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
const getAnnotations = (metadata: UploadMetadata[], appliedTemplate: Template): MMSAnnotationValueRequest[] => {
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
                    values: castArray(value).map((v) => v.toString()),
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
], (uploads: UploadStateBranch, template?: Template): Uploads => {
    if (!template) {
        throw new Error("Template has not been applied");
    }

    let result = {};
    const metadataGroupedByFile = groupBy(values(uploads), "file");
    forEach(metadataGroupedByFile, (metadata: UploadMetadata[], fullPath: string) => {
        // to support the current way of storing metadata in bob the blob, we continue to include
        // wellIds and workflows in the microscopy block. Since a file may have 1 or more scenes and channels
        // per file, we set these values to a uniq list of all of the values found across each "dimension"
        const wellIds = uniq(flatMap(metadata, (m) => m.wellIds));
        const workflows = uniq(flatMap(metadata, (m) => m.workflows || []));
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

const numberOfJobsRegex = /^([^\s])+/;
export const getUploadJobName = createSelector([
    getUploadJobNames,
    getSelectedBarcode,
    getSelectedWorkflows,
], (uploadJobNames: string[], barcode?: string, workflows?: Workflow[]) => {
    if (!barcode) {
        if (!workflows) {
            return "";
        }
        const workflowNames = workflows.map((workflow) => workflow.name).join(LIST_DELIMITER_JOIN);
        const jobNamesForWorkflow = uploadJobNames.filter((name) => {
            // name could look like "barcode" or "barcode (1)". We want to get just "barcode"
            const workflowParts = name.match(numberOfJobsRegex);
            return workflowParts && workflowParts.length > 0 && workflowParts[0] === workflowNames;
        });
        const numberOfJobsWithWorkflow = jobNamesForWorkflow.length;
        return numberOfJobsWithWorkflow === 0 ? workflowNames : `${workflowNames} (${numberOfJobsWithWorkflow})`;
    }

    const jobNamesForBarcode = uploadJobNames.filter((name) => {
        // name could look like "barcode" or "barcode (1)". We want to get just "barcode"
        const barcodeParts = name.match(numberOfJobsRegex);
        return barcodeParts && barcodeParts.length > 0 && barcodeParts[0] === barcode;
    });
    const numberOfJobsWithBarcode = jobNamesForBarcode.length;
    return numberOfJobsWithBarcode === 0 ? barcode : `${barcode} (${numberOfJobsWithBarcode})`;
});
