import { difference, flatMap, isEmpty } from "lodash";
import { createSelector } from "reselect";

import {
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../constants";
import { Workflow } from "../../services/labkey-client/types";
import {
  getSelectedWellsWithData,
  getSelectedWorkflows,
} from "../../state/selection/selectors";
import { Well } from "../../state/selection/types";
import { UploadMetadata, UploadStateBranch } from "../../state/types";
import { getUpload } from "../../state/upload/selectors";

export const getWellsWithAssociations = createSelector(
  [getUpload],
  (upload: UploadStateBranch): number[] => {
    return flatMap(
      upload,
      (m: UploadMetadata) => m[WELL_ANNOTATION_NAME] || []
    );
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
      isEmpty(difference(selectedWellIds, metadata[WELL_ANNOTATION_NAME] || []))
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
