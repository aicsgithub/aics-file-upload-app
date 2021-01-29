import { basename } from "path";

import { createSelector } from "reselect";

import { JSSJob } from "../../services/job-status-client/types";
import { getCurrentUploadFilePath } from "../../state/metadata/selectors";
import { getSelectedJob } from "../../state/selection/selectors";

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
