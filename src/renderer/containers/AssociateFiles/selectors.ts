import { difference, isEmpty, reduce, uniq } from "lodash";
import { createSelector } from "reselect";

import { getSelectedWellsWithData, getSelectedWorkflows } from "../../state/selection/selectors";
import { Well, Workflow } from "../../state/selection/types";
import { getUpload } from "../../state/upload/selectors";
import { UploadMetadata, UploadStateBranch } from "../../state/upload/types";

export interface IdToFilesMap {
    [Id: number]: string[]; // filePaths
    [name: string]: string[]; // filePaths
}

export const getWellIdToFiles = createSelector([getUpload], (upload: UploadStateBranch): IdToFilesMap => {
    return reduce(upload, (result: IdToFilesMap, {wellIds}: UploadMetadata, filePath: string) => {
        if (!wellIds) {
            return {};
        }
        return {
            ...result,
            ...reduce(wellIds, (accum: IdToFilesMap, wellId: number) => {
                const files = accum[wellId] || [];
                return {
                    ...accum,
                    [wellId]: uniq([...files, filePath]),
                };
            }, {}),
        };
    }, {});
});

export const getWorkflowNameToFiles = createSelector([getUpload], (upload: UploadStateBranch): IdToFilesMap => {
    return reduce(upload, (result: IdToFilesMap, {workflows}: UploadMetadata, filePath: string) => {
        if (!workflows) {
            return {};
        }
        return {
            ...result,
            ...reduce(workflows, (accum: IdToFilesMap, workflow: string) => {
                const files = accum[workflow] || [];
                return {
                    ...accum,
                    [workflow]: uniq([...files, filePath]),
                };
            }, {}),
        };
    }, {});
});

export const getMutualFilesForWells = createSelector([
    getSelectedWellsWithData,
    getUpload,
], (selectedWellsData: Well[], upload: UploadStateBranch): string[] => {
    if (isEmpty(selectedWellsData)) {
        return [];
    }

    const selectedWellIds = selectedWellsData.map((well: Well) => well.wellId);

    return reduce(upload, (files: string[], metadata: UploadMetadata, filepath: string) => {
        const allWellsFound = isEmpty(difference(selectedWellIds, metadata.wellIds));
        const accum = [...files];
        if (allWellsFound) {
            accum.push(filepath);
        }
        return accum;
    }, []);
});

export const getMutualFilesForWorkflows = createSelector([
    getSelectedWorkflows,
    getUpload,
], (workflows: Workflow[], upload: UploadStateBranch): string[] => {
    if (isEmpty(workflows)) {
        return [];
    }

    const selectedWorkflowNames = workflows.map((workflow: Workflow) => workflow.name);

    return reduce(upload, (files: string[], metadata: UploadMetadata, filepath: string) => {
        if (!metadata.workflows) {
            return files;
        }
        const allWorkflowsFound = isEmpty(difference(selectedWorkflowNames, metadata.workflows));
        const accum = [...files];
        if (allWorkflowsFound) {
            accum.push(filepath);
        }
        return accum;
    }, []);
});
