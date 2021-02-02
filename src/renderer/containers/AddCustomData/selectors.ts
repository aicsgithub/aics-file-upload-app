import { isEqual } from "lodash";
import { createSelector } from "reselect";

import {
  FAILED_STATUSES,
  JSSJob,
} from "../../services/job-status-client/types";
import { getRequestsInProgress } from "../../state/feedback/selectors";
import { getCurrentJobName } from "../../state/job/selectors";
import { getOriginalUpload } from "../../state/metadata/selectors";
import { getSelectedJob } from "../../state/selection/selectors";
import { AsyncRequest, UploadStateBranch } from "../../state/types";
import {
  getUpload,
  getUploadValidationErrors,
} from "../../state/upload/selectors";

export const getUploadInProgress = createSelector(
  [getRequestsInProgress, getCurrentJobName],
  (requestsInProgress: string[], jobName?: string) => {
    if (!jobName) {
      return false;
    }
    return (
      requestsInProgress.includes(
        `${AsyncRequest.UPDATE_FILE_METADATA}-${jobName}`
      ) ||
      requestsInProgress.includes(`${AsyncRequest.INITIATE_UPLOAD}-${jobName}`)
    );
  }
);

export const getCanSubmitUpload = createSelector(
  [
    getUploadValidationErrors,
    getRequestsInProgress,
    getUpload,
    getOriginalUpload,
    getSelectedJob,
    getCurrentJobName,
    getUploadInProgress,
  ],
  (
    validationErrors: string[],
    requestsInProgress: string[],
    upload: UploadStateBranch,
    originalUpload?: UploadStateBranch,
    selectedJob?: JSSJob,
    currentJobName?: string,
    uploadInProgress?: boolean
  ): boolean => {
    if (!Object.keys(upload).length || uploadInProgress) {
      return false;
    }
    const uploadRelatedRequests = [
      `${AsyncRequest.UPDATE_FILE_METADATA}-${currentJobName}`,
      `${AsyncRequest.INITIATE_UPLOAD}-${currentJobName}`,
    ];
    const requestsInProgressRelatedToUpload = requestsInProgress.filter((r) =>
      uploadRelatedRequests.includes(r)
    );
    const noValidationErrorsOrRequestsInProgress =
      validationErrors.length === 0 &&
      requestsInProgressRelatedToUpload.length === 0;
    if (selectedJob && FAILED_STATUSES.includes(selectedJob.status)) {
      return true;
    }
    return originalUpload
      ? noValidationErrorsOrRequestsInProgress &&
          !isEqual(upload, originalUpload)
      : noValidationErrorsOrRequestsInProgress;
  }
);
