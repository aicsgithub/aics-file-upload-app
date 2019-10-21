import { Uploads } from "@aics/aicsfiles/type-declarations/types";
import { forEach, groupBy, isArray, isEmpty, isNil, keys, map, omit, uniq, values, without } from "lodash";
import { extname } from "path";
import { createSelector } from "reselect";
import { getUploadJobNames } from "../job/selectors";
import { getExpandedUploadJobRows, getSelectedBarcode, getSelectedWorkflows } from "../selection/selectors";

import { ExpandedRows, Workflow } from "../selection/types";
import { State } from "../types";
import { getUploadRowKey, isChannelOnlyRow, isFileRow, isSceneRow } from "./constants";
import { FileType, UploadJobTableRow, UploadMetadata, UploadStateBranch } from "./types";

export const getUpload = (state: State) => state.upload.present;
export const getCurrentUploadIndex = (state: State) => state.upload.index;
export const getUploadPast = (state: State) => state.upload.past;
export const getUploadFuture = (state: State) => state.upload.future;

export const getSchemaFile = createSelector([getUpload], (uploads: UploadStateBranch): string | undefined =>
    Object.keys(uploads).length ? uploads[Object.keys(uploads)[0]].schemaFile : undefined
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

export const getUploadPayload = createSelector([getUpload], (uploads: UploadStateBranch): Uploads => {
    let result = {};
    map(uploads, ({wellIds, barcode, wellLabels, plateId, workflows, ...userData}: any, fullPath: string) => {
        const workflowNames = workflows && workflows.map((workflow: Workflow) => workflow.name);
        result = {
            ...result,
            [fullPath]: {
                file: {
                    fileType: extensionToFileTypeMap[extname(fullPath).toLowerCase()] || FileType.OTHER,
                    originalPath: fullPath,
                },
                microscopy: {
                    ...wellIds && { wellIds },
                    ...workflows && { workflows: workflowNames },
                },
                userData: omit(userData, "file"),
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
