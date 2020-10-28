// Errors
import { exists as fsExists, promises } from "fs";
import { promisify } from "util";

import { FileSystemUtil } from "./types";

export const COPY_ERROR = "CopyError";
export const FAILED_JOB_ERROR = "FailedJobError";
export const ILLEGAL_ARGUMENT_ERROR = "IllegalArgumentError";
export const INVALID_METADATA_ERROR = "InvalidMetadataError";
export const UNRECOVERABLE_JOB_ERROR = "UnrecoverableJobError";

// Schemas
export const FILE_METADATA = "filemetadata";
export const FMS = "FMS";
export const UPLOADER = "uploader";

// Worker constants
export const UPLOAD_WORKER_SUCCEEDED = "worker-success";
export const UPLOAD_WORKER_ON_PROGRESS = "upload-progress";

// Misc.
export const DEFAULT_TIMEOUT = 5 * 60 * 1000;
export const AICSFILES_LOGGER = "aicsfiles";

const exists = promisify(fsExists);
export const defaultFs: FileSystemUtil = {
  access: promises.access,
  exists,
  stat: promises.stat,
};
