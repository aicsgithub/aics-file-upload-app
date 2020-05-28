import { difference, flatMap, isEmpty } from "lodash";
import { createSelector } from "reselect";

import { WORKFLOW_ANNOTATION_NAME } from "../../constants";
import {
  getSelectedWellsWithData,
  getSelectedWorkflows,
} from "../../state/selection/selectors";
import { Well, Workflow } from "../../state/selection/types";
import { getUpload } from "../../state/upload/selectors";
import { UploadMetadata, UploadStateBranch } from "../../state/upload/types";

export const getWellsWithAssociations = createSelector(
  [getUpload],
  (upload: UploadStateBranch): number[] => {
    return flatMap(upload, ({ wellIds }: UploadMetadata) => wellIds);
  }
);

export const getWorkflowsWithAssociations = createSelector(
  [getUpload],
  (upload: UploadStateBranch): string[] => {
    return flatMap(
      upload,
      (m: UploadMetadata) => m[WORKFLOW_ANNOTATION_NAME] || []
    );
  }
);

export const getMutualUploadsForWells = createSelector(
  [getSelectedWellsWithData, getUpload],
  (selectedWellsData: Well[], upload: UploadStateBranch): UploadMetadata[] => {
    if (isEmpty(selectedWellsData)) {
      return [];
    }

    const selectedWellIds = selectedWellsData.map((well: Well) => well.wellId);

    return Object.values(upload).filter((metadata) =>
      isEmpty(difference(selectedWellIds, metadata.wellIds))
    );
  }
);

export const getMutualUploadsForWorkflows = createSelector(
  [getSelectedWorkflows, getUpload],
  (workflows: Workflow[], upload: UploadStateBranch): UploadMetadata[] => {
    if (isEmpty(workflows)) {
      return [];
    }

    const selectedWorkflowNames = workflows.map(
      (workflow: Workflow) => workflow.name
    );

    return Object.values(upload).filter(
      (metadata) =>
        metadata[WORKFLOW_ANNOTATION_NAME] &&
        isEmpty(
          difference(
            selectedWorkflowNames,
            metadata[WORKFLOW_ANNOTATION_NAME] || []
          )
        )
    );
  }
);
