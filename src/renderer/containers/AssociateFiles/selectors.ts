import { difference, isEmpty, reduce, uniq } from "lodash";
import { createSelector } from "reselect";

import {getSelectedWellsWithData, getSelectedWorkflows} from "../../state/selection/selectors";
import { Well, Workflow } from "../../state/selection/types";
import { getUpload } from "../../state/upload/selectors";
import { UploadMetadata, UploadStateBranch } from "../../state/upload/types";

export interface IdToFilesMap {
    [Id: number]: string[]; // filePaths
}

export const getWellIdToFiles = createSelector([getUpload], (upload: UploadStateBranch): IdToFilesMap => {
    return reduce(upload, (result: IdToFilesMap, {wellIds}: UploadMetadata, filePath: string) => {
        if (!wellIds) {
            return {};
        }
        return {
            ...result,
            ...reduce(wellIds, (accum2: IdToFilesMap, wellId: number) => {
                const files = accum2[wellId] || [];
                return {
                    ...accum2,
                    [wellId]: uniq([...files, filePath]),
                };
            }, {}),
        };
    }, {});
});

export const getWorkflowIdToFiles = createSelector([getUpload], (upload: UploadStateBranch): IdToFilesMap => {
    return reduce(upload, (result: IdToFilesMap, {workflows}: UploadMetadata, filePath: string) => {
        if (!workflows) {
            return {};
        }
        const workflowIds = workflows.map((workflow: Workflow) => workflow.workflowId);
        return {
            ...result,
            ...reduce(workflowIds, (accum: IdToFilesMap, workflowId: number) => {
                const files = accum[workflowId] || [];
                return {
                    ...accum,
                    [workflowId]: uniq([...files, filePath]),
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

    const selectedWorkflowIds = workflows.map((workflow: Workflow) => workflow.workflowId);

    return reduce(upload, (files: string[], metadata: UploadMetadata, filepath: string) => {
        const workflowIds = metadata.workflows.map((workflow: Workflow) => workflow.workflowId);
        const allWorkflowsFound = isEmpty(difference(selectedWorkflowIds, workflowIds));
        const accum = [...files];
        if (allWorkflowsFound) {
            accum.push(filepath);
        }
        return accum;
    }, []);
});
