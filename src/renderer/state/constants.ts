export const REQUEST_FAILED = "REQUEST_FAILED";
export const FAILED_STATUS = "FAILED";
export const IN_PROGRESS_STATUSES = [
  "WORKING",
  "RETRYING",
  "WAITING",
  "BLOCKED",
];
// Minimum amount of time between reports from the copy worker on how much has been copied
export const COPY_PROGRESS_THROTTLE_MS = 2000;
