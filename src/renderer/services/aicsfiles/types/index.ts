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

export interface UploadServiceFields {
  files: UploadMetadata[];
  mostRecentFailure?: string;
  replacementJobId?: string;
  result?: Array<{
    fileId: string;
    fileName: string;
    readPath: string;
  }>;
  type: string; // will be equal to "upload"
  uploadDirectory: string;
}

export interface CopyFilesServiceFields {
  error?: string;
  output?: SourceFiles; // populated after step completes
  totalBytesToCopy: number;
  type: string;
}

export interface CopyFileServiceFields {
  error?: string;
  originalPath: string;
  output?: SourceFiles; // populated after step completes
  totalBytes: number;
  type: string;
}

export interface AddMetadataServiceFields {
  error?: string;
  output?: FSSResponseFile[]; // populated after step completes
  type: string;
}

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
  fileId: string;
  templateId?: number;
  modified: string;
  modifiedBy: string;
}

export interface FileMetadata extends CustomFileMetadata, LabKeyFileMetadata {}

export interface FileToFileMetadata {
  [FileId: string]: FileMetadata;
}

// This object represents the notion of an ImageModel as a row of metadata, ImageModels are meant to represent
// either a specific FOV at some positionIndex &/or channel or represent the entire File. This allows us to have
// metadata at various dimensions of a File. For example, if an ImageModel has no positionIndex or channel then it
// represents the entire File's metadata, if it does have either of those values then it represents a specific FOV for
// a file.
export interface ImageModelMetadata extends ImageModelBase, LabKeyFileMetadata {
  channel?: string;
  templateId?: number;
  template?: string;
  [key: string]: any;
}

export interface LabKeyResponse<T> {
  rows: T[];
}
