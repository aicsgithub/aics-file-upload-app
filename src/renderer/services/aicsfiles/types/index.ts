import { JSSJob } from "../../job-status-client/types";

export interface Uploads {
  [filePath: string]: UploadMetadata;
}

export interface UploadResponse {
  [originalPath: string]: FSSResponseFile;
}

// FSS Request Types

export interface FSSRequestFile {
  fileName: string;
  md5hex: string;
  fileType: string;
  metadata: UploadMetadata;
  shouldBeInArchive?: boolean;
  shouldBeInLocal?: boolean;
}

export interface UploadMetadataRequest {
  jobId: string;
  files: FSSRequestFile[];
}

export interface ImageModelBase {
  channelId?: string;
  fovId?: number;
  positionIndex?: number;
  scene?: number;
  subImageName?: string;
}

// This is used for the POST request to mms for creating file metadata
export interface CustomFileAnnotationRequest extends ImageModelBase {
  annotationId: number;
  values: string[];
}

// This is used for the POST request to mms for creating file metadata
export interface CustomFileMetadataRequest {
  annotations: CustomFileAnnotationRequest[];
  templateId?: number;
}

export interface UploadMetadata {
  customMetadata: CustomFileMetadataRequest;
  fileType?: string;
  file: File;
  [id: string]: any;
}

export interface File {
  originalPath: string;
  fileName?: string;
  fileType: string;
  [id: string]: any;
}

// FSS Response Types

export interface StartUploadResponse {
  jobId: string;
  uploadDirectory: string;
}

export interface UploadMetadataResponse {
  jobId: string;
  files: FSSResponseFile[];
}

export interface FSSResponseFile {
  fileName: string;
  fileId: string;
  readPath: string;
}

export enum StepName {
  AddMetadata = "Add metadata about file and complete upload",
  CopyFilesChild = "Copy file",
  CopyFiles = "Copy files in parallel",
  Waiting = "Waiting for file copy",
}

export interface Step {
  // Called if step's job status is succeeded. This is for updating the upload
  // context with info stored in the job.
  skip: (ctx: UploadContext) => Promise<UploadContext>;

  // Called after running start (and not called if step is skipped)
  // Should include job updates that don't need to be awaited (like adding outputs from the last step)
  end: (ctx: UploadContext) => Promise<void>;

  // Job associated with step
  job: JSSJob;

  // Human readable name for step
  name: StepName;

  // Contains main procedure of step. It will return an updated upload context with
  // properties needed for the next steps.
  start: (ctx: UploadContext) => Promise<UploadContext>;
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

  // FSS doesn't currently support re-using jobs after an upload gets past the add metadata step.
  // This points to the jobId of the new upload job in case user tries to retry job and the previous jobId is no longer
  // being tracked by FSS. This is populated by the app.
  replacementJobId?: string;

  // populated by FSS: https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/file-storage-service-java/browse/src/main/java/org/alleninstitute/aics/filestorage/service/UploadJobProcessingService.java#266
  // when the app requests to start an upload.
  result?: FSSResponseFile[];

  // directory where all files of this upload are copied to by this app
  // populated by FSS when the app requests to start an upload.
  uploadDirectory: string;
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
}

// Represents the job of reporting to FSS
export interface AddMetadataServiceFields extends BaseServiceFields {
  output?: FSSResponseFile[]; // populated after step completes
}

// TODO: FUA-97 lisah there are other steps that are not being in JSS past the add metadata step.
// These will need to be created in FMS in order to produce more accurate upload progress reporting.
// One step that the app currently does not use when calculating upload progress is a step representing the ETL step.

export type UploadChildJobServiceFields =
  | AddMetadataServiceFields
  | CopyFilesServiceFields
  | CopyFileServiceFields;

export interface UploadContext {
  uploadChildJobIds?: string[];
  copyChildJobs?: JSSJob<CopyFileServiceFields>[];
  resultFiles?: FSSResponseFile[];
  sourceFiles?: SourceFiles;
  startUploadResponse: StartUploadResponse;
  totalBytesToCopy?: number;
  uploadJobName: string;
  uploads: Uploads;
  uploadJob?: JSSJob<UploadServiceFields>;
}

export interface SourceFiles {
  [file: string]: FSSRequestFile;
}

export enum FilterType {
  EQUALS = "EQUALS",
  IN = "IN",
}

export interface Filter {
  filterColumn: string;
  searchValue?: any | any[];
  type?: FilterType;
}

export interface Annotation extends ImageModelBase {
  annotationId: number;
  values: any[];
}

export interface LabKeyFileMetadata {
  archiveFilePath?: string;
  filename: string;
  fileId: string;
  fileSize: number;
  fileType: string;
  localFilePath?: string;
  publicFilePath?: string;
  thumbnailLocalFilePath?: string;
  thumbnailId?: string;
  modified: string;
  modifiedBy: string;
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

export interface LabKeyResponse<T> {
  rows: T[];
}
