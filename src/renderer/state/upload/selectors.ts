import { Uploads } from "@aics/aicsfiles/type-declarations/types";
import {
    castArray,
    forEach,
    groupBy,
    isArray,
    isEmpty,
    isNil,
    keys,
    omit,
    pick,
    some,
    startCase,
    uniq,
    values,
    without
} from "lodash";
import { extname } from "path";
import { createSelector } from "reselect";
import { flatMap } from "tslint/lib/utils";

import { getUploadJobNames } from "../job/selectors";
import { getExpandedUploadJobRows, getSelectedBarcode, getSelectedWorkflows } from "../selection/selectors";

import { ExpandedRows, Workflow } from "../selection/types";
import { getCompleteAppliedTemplate } from "../template/selectors";
import { Template } from "../template/types";
import { State } from "../types";
import { getUploadRowKey, isChannelOnlyRow, isFileRow, isSceneRow } from "./constants";
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

const convertToUploadJobRow = (metadata: UploadMetadata,
                               numberSiblings: number, siblingIndex: number,
                               treeDepth: number, hasSubRows: boolean = false,
                               channelIds: number[] = [], positionIndexes: number[] = []): UploadJobTableRow => ({
    ...metadata,
    channelIds,
    group: hasSubRows,
    key: getUploadRowKey(metadata.file, metadata.positionIndex,
        metadata.channel ? metadata.channel.channelId : undefined),
    numberSiblings,
    positionIndexes,
    siblingIndex,
    treeDepth,
    wellLabels: metadata.wellLabels ? metadata.wellLabels.sort().join(", ") : "",
    workflows: metadata.workflows ? metadata.workflows.join(", ") : "",
});

// there will be metadata for files, each scene in a file, each channel in a file, and every combo
// of scenes + channels
const getFileToMetadataMap = createSelector([
    getUpload,
], (uploads: UploadStateBranch): {[file: string]: UploadMetadata[]} => {
    return groupBy(values(uploads), ({file}: UploadMetadata) => file);
});

const getChannelOnlyRows = (allMetadataForFile: UploadMetadata[]) => {
    const channelMetadata = allMetadataForFile.filter(isChannelOnlyRow);
    return channelMetadata.map((c: UploadMetadata, siblingIndex: number) =>
        convertToUploadJobRow(c, channelMetadata.length, siblingIndex, 1));
};

const getSceneRows = (allMetadataForFile: UploadMetadata[], expandedRows: ExpandedRows, file: string) => {
    const sceneRows: UploadJobTableRow[] = [];
    const sceneMetadata = allMetadataForFile.filter(isSceneRow);
    const metadataGroupedByScene = groupBy(sceneMetadata, ({positionIndex}: UploadMetadata) => positionIndex);

    forEach(values(metadataGroupedByScene),
        (allMetadataForPositionIndex: UploadMetadata[], sceneIndex: number) => {
            const sceneParentMetadata = allMetadataForPositionIndex.find((m) => isNil(m.channel));
            if (sceneParentMetadata) {
                const sceneRow = convertToUploadJobRow(sceneParentMetadata, keys(metadataGroupedByScene).length,
                    sceneIndex, 1, allMetadataForPositionIndex.length > 1);
                sceneRows.push(sceneRow);

                if (expandedRows[getUploadRowKey(file, sceneParentMetadata.positionIndex)]) {
                    const sceneChannelMetadata = without(allMetadataForPositionIndex, sceneParentMetadata);
                    const sceneChannelRows = sceneChannelMetadata
                        .map((u: UploadMetadata, sceneChannelSiblingIndex: number) =>
                            convertToUploadJobRow(u, sceneChannelMetadata.length,
                                sceneChannelSiblingIndex, 2));
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
], (uploads: UploadStateBranch, expandedRows: ExpandedRows,
    metadataGroupedByFile: {[file: string]: UploadMetadata[]}): UploadJobTableRow[] => {

    // contains only rows that are visible (i.e. rows whose parents are expanded)
    const visibleRows: UploadJobTableRow[] = [];

    // populate visibleRows
    let fileSiblingIndex = -1;
    forEach(metadataGroupedByFile, (allMetadataForFile: UploadMetadata[], file: string) => {
        fileSiblingIndex++;
        const fileMetadata = allMetadataForFile.find(isFileRow);

        if (fileMetadata) {
            const channelRows = getChannelOnlyRows(allMetadataForFile);
            const sceneRows = getSceneRows(allMetadataForFile, expandedRows, file);

            // file rows are always visible
            const hasSubRows = channelRows.length + sceneRows.length > 0;
            const allChannelIds = uniq(allMetadataForFile
                .filter((m: UploadMetadata) => !!m.channel)
                .map((m: UploadMetadata) => m.channel!.channelId));
            const allPositionIndexes: number[] = uniq(allMetadataForFile
                .filter((m: UploadMetadata) => !isNil(m.positionIndex))
                .map((m: UploadMetadata) => m.positionIndex)) as number[];
            const fileRow = convertToUploadJobRow(fileMetadata, keys(metadataGroupedByFile).length, fileSiblingIndex,
                0, hasSubRows, allChannelIds, allPositionIndexes);
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
    (metadataGroupedByFile: {[file: string]: UploadMetadata[]}) => {
        const result: {[file: string]: {[key: string]: boolean}} = {};
        forEach(metadataGroupedByFile, (allMetadata: UploadMetadata[], file: string) => {
            result[file] = allMetadata.reduce((accum: {[key: string]: boolean}, curr: UploadMetadata) => {
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

export const getCanSave = createSelector([
    getUploadSummaryRows,
    getFileToAnnotationHasValueMap,
    getCompleteAppliedTemplate,
], (
    rows: UploadJobTableRow[],
    fileToAnnotationHasValueMap: {[file: string]: {[key: string]: boolean}},
    template?: Template
): boolean => {
    if (!template || !rows.length) {
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

const extensionToFileTypeMap: {[index: string]: FileType} = {
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

const EXCLUDED_UPLOAD_FIELDS = [
    "barcode",
    "channel",
    "file",
    "key",
    "plateId",
    "positionIndex",
    "templateId",
    "wellLabels",
    "wellIds",
    "workflows",
];
// the userData relates to the same file but differs for scene/channel combinations
const getAnnotations = (metadata: UploadMetadata[], appliedTemplate: Template) => {
    return flatMap(metadata, (metadatum: UploadMetadata) => {
        const customData = omit(metadatum, EXCLUDED_UPLOAD_FIELDS);
        const renamedData = {...customData, well: metadatum.wellIds, workflow: metadatum.workflows};
        const result: MMSAnnotationValueRequest[] = [];
        forEach(renamedData, (value: any, annotationName: string) => {
            const addAnnotation = Array.isArray(value) ? !isEmpty(value) : !isNil(value);
            if (addAnnotation) {
                annotationName = startCase(annotationName);
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
                    values: castArray(value),
                });
            }
        });
        return result;
    });
};

export const getUploadPayload = createSelector([
    getUpload,
    getCompleteAppliedTemplate,
], (uploads: UploadStateBranch, appliedTemplate?: Template): Uploads => {
    if (!appliedTemplate) {
        throw new Error("Template has not been applied");
    }

    let result = {};
    const metadataGroupedByFile = groupBy(values(uploads), "file");
    forEach(metadataGroupedByFile, (
        metadata: UploadMetadata[],
        fullPath: string
    ) => {
        const wellIds = uniq(flatMap(metadata, (m) => m.wellIds));
        const workflows = uniq(flatMap(metadata, (m) => m.workflows || []));
        result = {
            ...result,
            [fullPath]: {
                file: {
                    fileType: extensionToFileTypeMap[extname(fullPath).toLowerCase()] || FileType.OTHER,
                    originalPath: fullPath,
                },
                fileMetadata: {
                    requests: [
                        {
                            annotations: getAnnotations(metadata, appliedTemplate),
                            templateId: appliedTemplate.templateId,
                        },
                    ],
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
        const workflowNames = workflows.map((workflow) => workflow.name).join(", ");
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
