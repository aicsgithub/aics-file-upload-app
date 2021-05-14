import { FSSResponseFile } from "../file-storage-client";

import { LabKeyFileMetadata } from "./helpers/querier";

// Misc.
export const AICSFILES_LOGGER = "aicsfiles";

interface ImageModelBase {
  channelId?: string;
  fovId?: number;
  positionIndex?: number;
  scene?: number;
  subImageName?: string;
}

// This is used for the POST request to mms for creating file metadata
interface CustomFileAnnotationRequest extends ImageModelBase {
  annotationId: number;
  values: string[];
}

interface File {
  originalPath: string;
  fileName?: string;
  fileType: string;
  [id: string]: any;
}

export interface UploadMetadata {
  customMetadata: {
    annotations: CustomFileAnnotationRequest[];
    templateId?: number;
  };
  fileType?: string;
  file: File;
  [id: string]: any;
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
  // populated by app if a file from this upload was deleted
  deletedFileIds?: string[];

  // populated by FSS when the app requests to start an upload.
  files: UploadMetadata[];

  // a mapping for all files of this job to their MD5 at the time of the last upload.
  md5: { [originalPath: string]: string };

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

// Represents the job of copying a batch of files
export interface CopyFilesServiceFields extends BaseServiceFields {
  // populated after step completes
  output?: SourceFiles;

  // number of bytes total in this upload (that potentially spans multiple files)
  // used by app for showing upload progress.
  totalBytesToCopy: number;
}

// Represents the job of copying a single files
export interface CopyFileServiceFields extends BaseServiceFields {
  // source destination of file being copied
  originalPath: string;

  // populated after step completes
  output?: SourceFiles;

  // size of the file being copied
  totalBytes: number;

  // upload job id
  uploadJobId: string;
}

// Represents the job of reporting to FSS
export interface AddMetadataServiceFields extends BaseServiceFields {
  output?: FSSResponseFile[]; // populated after step completes
}

export interface Annotation extends ImageModelBase {
  annotationId: number;
  values: any[];
}

export interface CustomFileMetadata {
  annotations: Annotation[];
  originalPath?: string;
  shouldBeInArchive?: boolean;
  shouldBeInLocal?: boolean;
  templateId?: number;
}

export interface FileMetadata extends CustomFileMetadata, LabKeyFileMetadata {}

export interface FileToFileMetadata<T extends CustomFileMetadata = any> {
  [FileId: string]: T;
}

// This object represents the notion of an ImageModel as a row of metadata, ImageModels are meant to represent
// either a specific FOV at some positionIndex &/or channel or represent the entire File. This allows us to have
// metadata at various dimensions of a File. For example, if an ImageModel has no positionIndex or channel then it
// represents the entire File's metadata, if it does have either of those values then it represents a specific FOV for
// a file.
export interface ImageModelMetadata extends ImageModelBase, LabKeyFileMetadata {
  channel?: string;
  originalPath?: string;
  templateId?: number;
  template?: string;
  shouldBeInArchive?: boolean;
  shouldBeInLocal?: boolean;
  [key: string]: any;
}
