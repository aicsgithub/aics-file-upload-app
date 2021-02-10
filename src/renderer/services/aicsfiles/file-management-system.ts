import * as path from "path";

import * as Logger from "js-logger";
import { ILogger, ILogLevel } from "js-logger/src/types";
import { isEmpty, noop } from "lodash";

import { LocalStorage } from "../../types";
import { LabkeyClient } from "../index";
import JobStatusClient from "../job-status-client";
import { AsyncJSSJob, JSSJob, JSSJobStatus } from "../job-status-client/types";
import MMSClient from "../mms-client";

import {
  AICSFILES_LOGGER,
  defaultFs,
  UNRECOVERABLE_JOB_ERROR,
} from "./constants";
import { InvalidMetadataError } from "./errors";
import { UnrecoverableJobError } from "./errors/UnrecoverableJobError";
import { CustomMetadataQuerier } from "./helpers/custom-metadata-querier";
import { FSSClient } from "./helpers/fss-client";
import { Uploader } from "./helpers/uploader";
import {
  FileMetadata,
  FileSystemUtil,
  FileToFileMetadata,
  ImageModelMetadata,
  StartUploadResponse,
  UploadMetadata,
  UploadResponse,
  Uploads,
} from "./types";

// Configuration object for FMS. Either host and port have to be defined or fss needs
// to be defined.
export interface FileManagementSystemConfig {
  fs: FileSystemUtil;
  // getter function for creating a copy worker
  getCopyWorker: () => Worker;

  // minimum level to output logs at
  logLevel?: "debug" | "error" | "info" | "trace" | "warn";

  // Only useful for testing. If not specified, will use logLevel to create a logger.
  logger?: ILogger;

  // Client for interacting with FSS
  fssClient: FSSClient;

  // Client for interacting with JSS.
  jobStatusClient: JobStatusClient;

  // Client for LabKey
  labkeyClient: LabkeyClient;

  // Client for interacting with MMS
  mmsClient: MMSClient;

  storage: LocalStorage;

  // Uploads files. Only useful for testing.
  uploader?: Uploader;
}

export const getDuplicateFilesError = (name: string): string =>
  `Multiple files supplied with the same name for a upload: ${name}`;
export const getFileDoesNotExistError = (fullpath: string): string =>
  `Can not find file: ${fullpath}`;
export const getFilePropertyMissingError = (fullpath: string): string =>
  `metadata for file ${fullpath} is missing the property file`;
export const getFileTypePropertyMissingError = (fullpath: string): string =>
  `metadata for file ${fullpath} is missing the property file.fileType`;
export const noFilesError = "No files were included in the request";
export const getOriginalPathPropertyMissingError = (fullpath: string): string =>
  `metadata for file ${fullpath} is missing the property file.originalPath which should equal ${fullpath}`;
export const getOriginalPathPropertyDoesntMatch = (
  fullpath: string,
  originalPath: string
): string =>
  `metadata for file ${fullpath} has property file.originalPath set to ${originalPath} which doesn't match ${fullpath}`;

const logLevelMap: { [logLevel: string]: ILogLevel } = Object.freeze({
  debug: Logger.DEBUG,
  error: Logger.ERROR,
  info: Logger.INFO,
  trace: Logger.TRACE,
  warn: Logger.WARN,
});

// Main class exported from library for interacting with the uploader
export class FileManagementSystem {
  private readonly fss: FSSClient;
  private readonly lk: LabkeyClient;
  private readonly jobStatusClient: JobStatusClient;
  private readonly logger: ILogger;
  private readonly uploader: Uploader;
  private readonly customMetadataQuerier: CustomMetadataQuerier;
  private readonly fs: FileSystemUtil;

  /*
        This returns the shared FileMetadata between the two given FileMetadata objects

        :param fileMetadata1: The first FileMetadata object
        :param fileMetadata2: The second FileMetadata object
        :return: The shared FileMetadata between the two supplied objects
    */
  public static innerJoinFileMetadata(
    fileMetadata1: FileToFileMetadata,
    fileMetadata2: FileToFileMetadata
  ): FileToFileMetadata {
    return CustomMetadataQuerier.innerJoinResults(fileMetadata1, fileMetadata2);
  }

  public constructor(config: FileManagementSystemConfig) {
    const {
      jobStatusClient,
      fs = defaultFs,
      fssClient,
      getCopyWorker,
      labkeyClient,
      logger,
      mmsClient,
      storage,
      uploader,
    } = config;
    const { logLevel = "error" } = config;

    this.jobStatusClient = jobStatusClient;
    this.lk = labkeyClient;
    this.uploader =
      uploader ||
      new Uploader(
        getCopyWorker,
        fssClient,
        jobStatusClient,
        labkeyClient,
        storage
      );
    // eslint-disable-next-line react-hooks/rules-of-hooks
    Logger.useDefaults({ defaultLevel: logLevelMap[logLevel] });
    this.logger = logger || Logger.get(AICSFILES_LOGGER);

    this.fss = fssClient;
    this.customMetadataQuerier = new CustomMetadataQuerier(
      mmsClient,
      this.lk,
      this.logger
    );
    this.fs = fs;
  }

  /***
     * Check for duplicate file names in a metadata mapping.
     FSS will allow multiple files with the same name to be uploaded, but ultimately only
     the most recently added will have precedence. This will raise an exception if a file
     with a duplicate name (but in a different folder) is found
     * @param metadata
     * @param uploadJobName
     * Throws InvalidMetadataError if a file was not found or if more than one files have the same name
     * returns StartUploadResponse
     */
  public async validateMetadataAndGetUploadDirectory(
    metadata: Uploads,
    uploadJobName: string
  ): Promise<StartUploadResponse> {
    Logger.get(AICSFILES_LOGGER).info("Received uploadFiles request", metadata);

    const names = new Set();
    for (const [fullpath, fileMetadata] of Object.entries(metadata)) {
      const name = path.basename(fullpath);
      if (names.has(name)) {
        throw new InvalidMetadataError(getDuplicateFilesError(name));
      } else {
        names.add(name);
      }

      if (!(await this.fs.exists(fullpath))) {
        throw new InvalidMetadataError(getFileDoesNotExistError(fullpath));
      }

      if (!fileMetadata.file) {
        throw new InvalidMetadataError(getFilePropertyMissingError(fullpath));
      } else if (!fileMetadata.file.fileType) {
        throw new InvalidMetadataError(
          getFileTypePropertyMissingError(fullpath)
        );
      } else if (!fileMetadata.file.originalPath) {
        throw new InvalidMetadataError(
          getOriginalPathPropertyMissingError(fullpath)
        );
      } else if (fileMetadata.file.originalPath !== fullpath) {
        throw new InvalidMetadataError(
          getOriginalPathPropertyDoesntMatch(
            fullpath,
            fileMetadata.file.originalPath
          )
        );
      }
    }

    if (names.size === 0) {
      throw new InvalidMetadataError(noFilesError);
    }

    return this.fss.startUpload(
      metadata,
      uploadJobName,
      await this.uploader.getLastModified(Object.keys(metadata))
    );
  }

  /***
   * Uploads one or more files and saves metadata associated with each file
   * @param startUploadResponse
   * @param uploads an object where the keys are fullpaths of the files to upload and the values are
   * metadata objects whose structures are defined by
   * http://confluence.corp.alleninstitute.org/display/SF/Metadata+Structure+for+Files+in+FMS
   * @param jobName Used to identify messages sent by aicsfiles.
   * @param copyProgressCb Optional callback that takes total bytes copied as param and does something with it
   * @param copyProgressCbThrottleMs minimum amount of ms between calls to copyProgressCb
   */
  public async uploadFiles(
    startUploadResponse: StartUploadResponse,
    uploads: Uploads,
    jobName: string,
    user: string,
    copyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ): Promise<UploadResponse> {
    this.logger.time("upload");
    try {
      const response = await this.uploader.uploadFiles(
        startUploadResponse,
        uploads,
        jobName,
        copyProgressCb,
        copyProgressCbThrottleMs
      );
      this.logger.timeEnd("upload");
      return response;
    } catch (e) {
      this.logger.timeEnd("upload");
      await this.failUpload(startUploadResponse.jobId, user, e.message);
      throw e;
    }
  }

  public async retryUpload(
    uploadJob: JSSJob,
    copyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ): Promise<UploadResponse> {
    this.logger.time("upload");
    if (!uploadJob.serviceFields || isEmpty(uploadJob.serviceFields.files)) {
      await this.failUpload(
        uploadJob.jobId,
        uploadJob.user,
        "Missing serviceFields.files",
        JSSJobStatus.UNRECOVERABLE
      );
      throw new UnrecoverableJobError(
        "Upload job is missing serviceFields.files"
      );
    }

    const uploads = uploadJob.serviceFields.files.reduce(
      (uploads: Uploads, file: UploadMetadata) => ({
        ...uploads,
        [file.file.originalPath]: file,
      }),
      {}
    );
    this.logger.info(`Retrying upload for jobId=${uploadJob.jobId}.`);
    this.logger.info("uploads", uploads);

    try {
      const response = await this.uploader.retryUpload(
        uploads,
        uploadJob,
        copyProgressCb,
        copyProgressCbThrottleMs
      );
      this.logger.timeEnd("upload");
      return response;
    } catch (e) {
      this.logger.timeEnd("upload");
      if (e.name === UNRECOVERABLE_JOB_ERROR) {
        await this.failUpload(
          uploadJob.jobId,
          uploadJob.user,
          e.message,
          JSSJobStatus.UNRECOVERABLE
        );
      } else {
        await this.failUpload(uploadJob.jobId, uploadJob.user, e.message);
      }
      throw e;
    }
  }

  /**
   * Marks a job and its children as failed in JSS.
   * @param jobId - ID of the JSS Job to fail.
   * @param failureMessage - Optional message that will be written to
   * `serviceFields.error`. Defaults to "Job failed".
   * @param failureStatus - Optional status to fail the job with. Defaults to
   * JSSJobStatus.FAILED.
   * @param serviceFields - Optional service fields to update the job with in addition to the error
   */
  public async failUpload(
    jobId: string,
    user: string,
    failureMessage = "Job failed",
    failureStatus:
      | JSSJobStatus.FAILED
      | JSSJobStatus.UNRECOVERABLE = JSSJobStatus.FAILED,
    serviceFields: any = {}
  ): Promise<AsyncJSSJob[]> {
    const failedJobs: AsyncJSSJob[] = [];

    const failJob = async (id: string): Promise<AsyncJSSJob> => {
      const request = {
        status: failureStatus,
        serviceFields: {
          error: failureMessage,
          ...serviceFields,
        },
      };
      await this.jobStatusClient.updateJob(id, request);
      const failedJob = { jobId: id, user, ...request };
      failedJobs.push(failedJob);
      return failedJob;
    };

    const job = await failJob(jobId);

    return [job];

    // if (job.childIds?.length) {
    //   const childJobs = await Promise.all(job.childIds.map(failJob));

    //   const childrenOfChildren: string[] = childJobs
    //     .filter((childJob) => childJob.childIds?.length)
    //     .flatMap((childJob) => childJob.childIds ?? "");

    //   if (childrenOfChildren.length > 0) {
    //     await Promise.all(childrenOfChildren.map(failJob));
    //   }
    // }

    // return failedJobs;
  }

  /*
        This method queries for metadata related to the given File ID.

        :param fileId: The FileID for the file we are
        :return: Metadata object representing all metadata for the file
    */
  public getCustomMetadataForFile(fileId: string): Promise<FileMetadata> {
    return this.customMetadataQuerier.queryByFileId(fileId);
  }

  /*
        Transforms file metadata given into a table like format easier for displaying to users or exporting to character
        separated value sets.

        :param filesToFileMetadata: Object mapping File Ids to MMS GET File Metadata responses
        :return: Array of ImageModels to their metadata
     */
  public transformFileMetadataIntoTable(
    fileToFileMetadata: FileToFileMetadata
  ): Promise<ImageModelMetadata[]> {
    return this.customMetadataQuerier.transformFileMetadataIntoTable(
      fileToFileMetadata
    );
  }
}
