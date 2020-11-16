import { basename } from "path";

import { flatMap, forEach, groupBy, uniq } from "lodash";
import { createSelector } from "reselect";

import {
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../constants";
import { JSSJob } from "../../services/job-status-client/types";
import { ImagingSession } from "../../services/labkey-client/types";
import { PlateResponse, WellResponse } from "../../services/mms-client/types";
import {
  getCurrentUploadFilePath,
  getImagingSessions,
} from "../../state/metadata/selectors";
import { getPage } from "../../state/route/selectors";
import {
  getAllPlates,
  getSelectedJob,
  getWellIdToWellMap,
} from "../../state/selection/selectors";
import { Page, UploadMetadata, UploadStateBranch } from "../../state/types";
import {
  getUpload,
  getWellLabelAndImagingSessionName,
} from "../../state/upload/selectors";
import { FileTag, FileTagType } from "../../state/upload/types";

// Result used by the FolderTree to display tags by each file with associated metadata
export const getFileToTags = createSelector(
  [getUpload, getImagingSessions, getAllPlates, getWellIdToWellMap, getPage],
  (
    upload: UploadStateBranch,
    imagingSessions: ImagingSession[],
    selectedPlates: PlateResponse[],
    wellIdToWellMap: Map<number, WellResponse>,
    page: Page
  ): Map<string, FileTag[]> => {
    const uploadsGroupedByFile = groupBy(upload, "file");
    const result = new Map<string, FileTag[]>();
    forEach(
      uploadsGroupedByFile,
      (metadata: UploadMetadata[], file: string) => {
        const workflows = flatMap(
          metadata,
          (m) => m[WORKFLOW_ANNOTATION_NAME] || []
        );
        const wellIds = flatMap(metadata, (m) => m[WELL_ANNOTATION_NAME] || []);
        const wellTags: Array<{ label: string; wellId: number }> = [];
        wellIds.forEach((wellId: number) => {
          const label = getWellLabelAndImagingSessionName(
            wellId,
            imagingSessions,
            selectedPlates,
            wellIdToWellMap
          );
          wellTags.push({ label, wellId });
        });

        const isOnAssociateFilesPage: boolean = page === Page.AssociateFiles;
        const tags: FileTag[] = [
          ...uniq(workflows).map((workflow: string) => ({
            closable: isOnAssociateFilesPage,
            color: "blue",
            title: workflow,
            type: FileTagType.WORKFLOW,
            workflow,
          })),
          ...uniq(wellTags).map(({ label, wellId }) => ({
            closable: isOnAssociateFilesPage,
            color: "magenta",
            title: label,
            type: FileTagType.WELL,
            wellId,
          })),
        ];
        result.set(file, tags);
      }
    );
    return result;
  }
);

export const getUploadTabName = createSelector(
  [getCurrentUploadFilePath, getSelectedJob],
  (filePath?: string, selectedJob?: JSSJob): string => {
    if (filePath) {
      return basename(filePath, ".json");
    }

    if (selectedJob) {
      return selectedJob.jobName || selectedJob.jobId;
    }

    return "Current Upload";
  }
);
