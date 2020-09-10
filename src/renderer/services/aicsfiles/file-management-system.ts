import { exists as fsExists, stat as fsStat, Stats } from "fs";
import { userInfo } from "os";
import * as path from "path";
import { basename } from "path";
import { promisify } from "util";

import * as Logger from "js-logger";
import { ILogger, ILogLevel } from "js-logger/src/types";
import { isEmpty, noop, trim } from "lodash";

import JobStatusClient from "../job-status-client";
import { JSSJob } from "../job-status-client/types";
import MMSClient from "../mms-client";

import { FSSConnection, LabKeyConnection } from "./connections";
import { AICSFILES_LOGGER, UNRECOVERABLE_JOB_ERROR } from "./constants";
import { CustomMetadataQuerier } from "./custom-metadata-querier";
import { IllegalArgumentError, InvalidMetadataError } from "./errors";
import { UnrecoverableJobError } from "./errors/UnrecoverableJobError";
import {
  FileMetadata,
  FileToFileMetadata,
  ImageModelMetadata,
  StartUploadResponse,
  UploadMetadata,
  UploadResponse,
  Uploads,
} from "./types";
import { Uploader } from "./uploader";

// Configuration object for FMS. Either host and port have to be defined or fss needs
// to be defined.
export interface FileManagementSystemConfig {
  // getter function for creating a copy worker
  getCopyWorker: () => Worker;

  // todo remove
  // Host that FSS is running on
  host?: string;

  // todo remove
  // Port that FSS is running on
  port?: string;

  // minimum level to output logs at
  logLevel?: "debug" | "error" | "info" | "trace" | "warn";

  // Only useful for testing. If not specified, will use logLevel to create a logger.
  logger?: ILogger;

  // todo make required
  // contains connection info for FSS. Only required if host/port not provided
  // FMS will use currently logged in user.
  // Only useful for testing.
  fss?: FSSConnection;

  // Client for interacting with JSS.
  jobStatusClient: JobStatusClient;

  // Client for interacting with MMS
  mmsClient: MMSClient;

  // todo update comment
  // Uploads files. Only required if host/port not provided. Only useful for testing.
  uploader?: Uploader;

  // todo remove
  username?: string;
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
const exists = promisify(fsExists);
const stat = promisify(fsStat);

const logLevelMap: { [logLevel: string]: ILogLevel } = Object.freeze({
  debug: Logger.DEBUG,
  error: Logger.ERROR,
  info: Logger.INFO,
  trace: Logger.TRACE,
  warn: Logger.WARN,
});

// Main class exported from library for interacting with the uploader
export class FileManagementSystem {
  public readonly fss: FSSConnection;
  public readonly mms: MMSClient;
  public readonly lk: LabKeyConnection;
  public readonly jobStatusClient: JobStatusClient;
  private readonly logger: ILogger;
  public readonly uploader: Uploader;
  public readonly customMetadataQuerier: CustomMetadataQuerier;
  public readonly getCopyWorker: () => Worker;

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

  public get port(): string {
    return this.fss.port;
  }

  public set port(port: string) {
    this.lk.port = port;
    this.fss.port = port;
  }

  public get host(): string {
    return this.fss.host;
  }

  public set host(host: string) {
    this.lk.host = host;
    this.fss.host = host;
  }

  public get username(): string {
    return this.fss.user;
  }

  public set username(username: string) {
    this.fss.user = username;
  }

  public get mountPoint(): string {
    return this.uploader.mountPoint;
  }

  public setMountPoint = async (mountPoint: string): Promise<void> => {
    mountPoint = mountPoint.replace(/(\/|\\)$/, "");

    if (!mountPoint || !trim(mountPoint)) {
      throw new Error("Mount point cannot be empty");
    } else if (basename(mountPoint) !== "aics") {
      throw new Error("Mount point directory must be named aics");
    }

    const stats: Stats = await stat(mountPoint);
    if (!stats.isDirectory()) {
      throw new Error("Mount point is not a directory");
    }

    this.uploader.mountPoint = mountPoint;
  };

  public constructor(config: FileManagementSystemConfig) {
    const {
      jobStatusClient,
      getCopyWorker,
      logger,
      mmsClient,
      port = "80",
      username = userInfo().username,
    } = config;
    let { fss, host, logLevel, uploader } = config;
    logLevel = logLevel || "error";

    if (!fss) {
      if (!host) {
        throw new IllegalArgumentError(
          "Host must be defined if fss is not defined"
        );
      }

      fss = new FSSConnection(host, port, username);
    }

    if (!uploader) {
      host = fss.host || host;
      if (!host) {
        throw new IllegalArgumentError(
          "Host must be defined if uploader is not defined"
        );
      }

      uploader = new Uploader(getCopyWorker, fss, jobStatusClient);
    }
    this.getCopyWorker = getCopyWorker;
    this.jobStatusClient = jobStatusClient;
    this.uploader = uploader;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    Logger.useDefaults({ defaultLevel: logLevelMap[logLevel] });
    this.logger = logger || Logger.get(AICSFILES_LOGGER);

    this.fss = fss;
    this.mms = mmsClient;
    this.lk = new LabKeyConnection(fss.host, fss.port, fss.user);
    this.customMetadataQuerier = new CustomMetadataQuerier(
      mmsClient,
      this.lk,
      this.logger
    );
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

      if (!(await exists(fullpath))) {
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

    return this.fss.startUpload(metadata, uploadJobName);
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
    copyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ): Promise<UploadResponse> {
    this.logger.info("using copy progress cb");
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
      await this.failUpload(startUploadResponse.jobId, e.message);
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
        "Missing serviceFields.files",
        "UNRECOVERABLE",
        true
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
          e.message,
          "UNRECOVERABLE",
          true
        );
      } else {
        await this.failUpload(uploadJob.jobId, e.message);
      }
      throw e;
    }
  }

  /**
   * Marks a job and its children as failed in JSS.
   * @param jobId - ID of the JSS Job to fail.
   * @param failureMessage - Optional message that will be written to
   * `serviceFields.mostRecentFailure`. Defaults to "Job failed".
   * @param failureStatus - Optional status to fail the job with. Defaults to
   * "FAILED".
   * @param setError - Also set `serviceFields.error` to `failureMessage`.
   */
  public async failUpload(
    jobId: string,
    failureMessage = "Job failed",
    failureStatus: "FAILED" | "UNRECOVERABLE" = "FAILED",
    setError = false
  ): Promise<JSSJob[]> {
    const failedJobs: JSSJob[] = [];

    const failJob = async (id: string) => {
      const serviceFields: any = {
        mostRecentFailure: failureMessage,
      };
      if (setError) {
        serviceFields.error = failureMessage;
      }
      const failedJob = await this.jobStatusClient.updateJob(id, {
        status: failureStatus,
        serviceFields,
      });
      failedJobs.push(failedJob);
      return failedJob;
    };

    const job = await failJob(jobId);

    if (job.childIds?.length) {
      const childJobs = await Promise.all(job.childIds.map(failJob));

      const childrenOfChildren: string[] = childJobs
        .filter((childJob) => childJob.childIds?.length)
        .flatMap((childJob) => childJob.childIds ?? "");

      if (childrenOfChildren.length > 0) {
        await Promise.all(childrenOfChildren.map(failJob));
      }
    }

    return failedJobs;
  }

  /*
        This method queries for all files that contain the given annotationName and are equal to the given value.

        :param annotationName: The name of the Annotation we are querying
        :param searchValue: The value the file should have for the Annotation we are querying
        :return: Dictionary of FileIds to metadata objects representing all metadata for the file
    */
  public getFilesByAnnotation(
    annotationName: string,
    searchValue: string
  ): Promise<FileToFileMetadata> {
    return this.customMetadataQuerier.queryByAnnotation(
      annotationName,
      searchValue
    );
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
        This method queries for all files that were uploaded by the given user.

        :param userName: The user that uploaded the files querying for
        :return: Dictionary of FileIds to metadata objects representing all metadata for the file
    */
  public getFilesByUser(userName: string): Promise<FileToFileMetadata> {
    return this.customMetadataQuerier.queryByUser(userName);
  }

  /*
        This method queries for all files that were uploaded by the given user.

        :param templateId: Id of the template used to upload the files querying for
        :return: Dictionary of FileIds to metadata objects representing all metadata for the file
    */
  public getFilesByTemplate(templateId: number): Promise<FileToFileMetadata> {
    return this.customMetadataQuerier.queryByTemplate(templateId);
  }

  /*
        Transforms file metadata given into a table like format easier for displaying to users or exporting to character
        separated value sets.

        :param filesToFileMetadata: Object mapping File Ids to MMS GET File Metadata responses
        :param transformDates: boolean whether to transform annotation values to date objects when appropriate
        :return: Array of ImageModels to their metadata
     */
  public transformFileMetadataIntoTable(
    fileToFileMetadata: FileToFileMetadata,
    transformDates = false
  ): Promise<ImageModelMetadata[]> {
    return this.customMetadataQuerier.transformFileMetadataIntoTable(
      fileToFileMetadata,
      transformDates
    );
  }

  /*
        Receives table formatted file metadata and transformed it into a character separated value set.

        :param header: Columns to include in the CSV
        :param rows: Array of metadata objects with keys matching the columns in the header,
            whitespace and casing doesn't matter
        :return: Character separated value set
     */
  public transformTableIntoCSV(
    header: string[],
    rows: ImageModelMetadata[],
    separator?: string
  ): string {
    return this.customMetadataQuerier.transformTableIntoCSV(
      header,
      rows,
      separator
    );
  }
}
