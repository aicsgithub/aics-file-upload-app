import { FSSResponseFile } from "../../services/fss-client";
import { JSSJob } from "../../services/job-status-client/types";
import { JobFilter, UploadProgressInfo, UploadRequest } from "../types";

export interface ReceiveJobsAction {
  payload: JSSJob[];
  type: string;
}

export interface ReceiveJobInsertAction {
  payload: JSSJob<BaseServiceFields>;
  type: string;
}

export interface ReceiveJobUpdateAction<T extends BaseServiceFields = any> {
  payload: JSSJob<T>;
  type: string;
}

export interface SelectJobFilterAction {
  payload: JobFilter;
  type: string;
}

export interface UpdateUploadProgressInfoAction {
  payload: {
    jobId: string;
    progress: UploadProgressInfo;
  };
  type: string;
}

// properties that belong to both parent and child jobs created through FMS
export interface BaseServiceFields {
  // if user decides to cancel an upload, the app sets this value to true.
  // This will be true only for uploads after 9/21/20 when this heuristic was created. Otherwise, check the error
  // field of serviceFields to see if the upload was cancelled.
  cancelled?: boolean;

  // populated by app when an exception is thrown during an upload
  error?: string;

  // represents the type job this object is representing. It will be equal to the name property of the step or "upload"
  // which is the parent job.
  type: "upload" | "copy" | "copy_child" | "add_metadata";
}

export interface UploadServiceFields extends BaseServiceFields {
  // if user decides to cancel an upload, the app sets this value to true.
  // This will be true only for uploads after 9/21/20 when this heuristic was created. Otherwise, check the error
  // field of serviceFields to see if the upload was cancelled.
  cancelled?: boolean;

  // populated by app when an exception is thrown during an upload
  error?: string;

  // Populated by app if a file from this upload was deleted
  deletedFileIds?: string[];

  // populated by FSS when the app requests to start an upload.
  files: UploadRequest[];

  // a mapping for all files of this job to their MD5 at the time of the last upload.
  md5: { [originalPath: string]: string };

  // ID of the upload group this job is a part of
  groupId?: string;

  // a mapping for all files of this job to when they were last modified. Used in addition to md5 mapping for
  // determining when to recalculate the MD5.
  // If the file has not been modified, then we can use the MD5 in combination with the file name to determine more
  // quickly if this file would be a duplicate in FMS.
  lastModified: { [originalPath: string]: string };

  // FSS doesn't currently support re-using jobs after an upload gets past the add metadata step.
  // This points to the original job id if this is a replacement job
  originalJobId?: string;

  // DEPRECATED in favor of using replacementJobIds
  // FSS doesn't currently support re-using jobs after an upload gets past the add metadata step.
  // This points to the jobId of the new upload job in case user tries to retry job and the previous jobId is no longer
  // being tracked by FSS. This is populated by the app.
  replacementJobId?: string;

  // FSS doesn't currently support re-using jobs after an upload gets past the add metadata step.
  // This points to the jobIds of the new upload job in case user tries to retry job and the previous jobId is no longer
  // being tracked by FSS. This is populated by the app.
  replacementJobIds?: string[];

  // populated by FSS: https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/file-storage-service-java/browse/src/main/java/org/alleninstitute/aics/filestorage/service/UploadJobProcessingService.java#266
  // when the app requests to start an upload.
  result?: FSSResponseFile[];

  // directory where all files of this upload are copied to by this app
  // populated by FSS when the app requests to start an upload.
  uploadDirectory: string;

  // Tracks how many bytes have been processed by FSS during its copy and MD5
  // calculation step. This field is populated by FSS.
  fssBytesProcessed?: number;
}
