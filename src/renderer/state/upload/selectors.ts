import { Uploads } from "@aics/aicsfiles/type-declarations/types";
import { isEmpty, map, omit } from "lodash";
import { extname } from "path";
import { createSelector } from "reselect";
import { getUploadJobNames } from "../job/selectors";
import { getSelectedBarcode, getSelectedWorkflows } from "../selection/selectors";

import { Workflow } from "../selection/types";
import { State } from "../types";
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

export const getUploadSummaryRows = createSelector([getUpload], (uploads: UploadStateBranch): UploadJobTableRow[] =>
    map(uploads, ({ barcode, notes, wellLabels, workflows, ...schemaProps }: UploadMetadata, fullPath: string) => ({
        barcode,
        file: fullPath,
        key: fullPath,
        notes,
        wellLabels: wellLabels ? wellLabels.sort().join(", ") : "",
        workflows: workflows ? workflows.join(", ") : [],
        ...schemaProps,
    }))
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
