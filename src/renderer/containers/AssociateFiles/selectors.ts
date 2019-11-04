import { difference, flatMap, isEmpty, reduce } from "lodash";
import { createSelector } from "reselect";

import { getSelectedWellsWithData, getSelectedWorkflows } from "../../state/selection/selectors";
import { Well, Workflow } from "../../state/selection/types";
import { getUpload } from "../../state/upload/selectors";
import { UploadMetadata, UploadStateBranch } from "../../state/upload/types";

export const getWellsWithAssociations = createSelector([getUpload], (upload: UploadStateBranch): number[] => {
    return flatMap(upload, ({wellIds}: UploadMetadata) => wellIds);
});

export const getWorkflowsWithAssociations = createSelector([getUpload], (upload: UploadStateBranch): string[] => {
    return flatMap(upload, ({workflows}: UploadMetadata) => workflows || []);
});

export const getMutualFilesForWells = createSelector([
    getSelectedWellsWithData,
    getUpload,
], (selectedWellsData: Well[], upload: UploadStateBranch): string[] => {
    if (isEmpty(selectedWellsData)) {
        return [];
    }

    const selectedWellIds = selectedWellsData.map((well: Well) => well.wellId);

    return reduce(upload, (files: string[], metadata: UploadMetadata) => {
        const filepath = metadata.file;
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

    return reduce(upload, (files: string[], metadata: UploadMetadata) => {
        if (!metadata.workflows) {
            return files;
        }
        const allWorkflowsFound = isEmpty(difference(selectedWorkflowNames, metadata.workflows));
        const accum = [...files];
        if (allWorkflowsFound) {
            accum.push(metadata.file);
        }
        return accum;
    }, []);
});
