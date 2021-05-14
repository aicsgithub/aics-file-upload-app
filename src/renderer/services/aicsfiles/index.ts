import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

import * as Logger from "js-logger";
import { ILogger, ILogLevel } from "js-logger/src/types";
import { isEmpty } from "lodash";

import { JobStatusClient, LabkeyClient } from "..";
import {
  FileStorageClient,
  StartUploadResponse,
  UploadMetadataResponse,
} from "../file-storage-client";
import { JSSJobStatus } from "../job-status-client/types";

import { InvalidMetadataError, UnrecoverableJobError } from "./errors";
import Copier from "./helpers/copier";
import Querier from "./helpers/querier";
import { AICSFILES_LOGGER } from "./util";
import { ImageModelMetadata, UploadMetadata } from "./util";

const exists = promisify(fs.exists);

// Configuration object for FMS. Either host and port have to be defined or fss needs
// to be defined.
export interface FileManagementSystemConfig {
  // TODO:
  lk: LabkeyClient;

  // TODO
  fss: FileStorageClient;

  // TODO
  jss: JobStatusClient;

  // Client responsible for uploading files into the FMS
  copier: Copier;

  // Client responsible for querying files within the FMS
  querier: Querier;

  // minimum level to output logs at
  logLevel?: "debug" | "error" | "info" | "trace" | "warn";
}

interface FilePathToMetadata {
  [filePath: string]: UploadMetadata;
}

export const getFileAlreadyExistsMessage = (name: string): string =>
  `File already exists according to MD5 & filename: ${name}`;
export const getFileDoesNotExistError = (fullpath: string): string =>
  `Can not find file: ${fullpath}`;
export const getFilePropertyMissingError = (fullpath: string): string =>
  `metadata for file ${fullpath} is missing the property file`;
export const getFileTypePropertyMissingError = (fullpath: string): string =>
  `metadata for file ${fullpath} is missing the property file.fileType`;
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
export default class FileManagementSystem {
  private readonly logger: ILogger = Logger.get(AICSFILES_LOGGER);
  private readonly lk: LabkeyClient;
  private readonly fss: FileStorageClient;
  private readonly jss: JobStatusClient;
  private readonly copier: Copier;
  private readonly querier: Querier;

  private static async validateMetadata(
    filePath: string,
    metadata: UploadMetadata
  ): Promise<void> {
    if (!(await exists(filePath))) {
      throw new InvalidMetadataError(getFileDoesNotExistError(filePath));
    }
    if (!metadata.file) {
      throw new InvalidMetadataError(getFilePropertyMissingError(filePath));
    }
    if (!metadata.file.fileType) {
      throw new InvalidMetadataError(getFileTypePropertyMissingError(filePath));
    }
    if (!metadata.file.originalPath) {
      throw new InvalidMetadataError(
        getOriginalPathPropertyMissingError(filePath)
      );
    }
    if (metadata.file.originalPath !== filePath) {
      throw new InvalidMetadataError(
        getOriginalPathPropertyDoesntMatch(filePath, metadata.file.originalPath)
      );
    }
  }

  public constructor({
    lk,
    fss,
    jss,
    copier,
    querier,
    logLevel = "error",
  }: FileManagementSystemConfig) {
    this.lk = lk;
    this.fss = fss;
    this.jss = jss;
    this.copier = copier;
    this.querier = querier;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    Logger.useDefaults({ defaultLevel: logLevelMap[logLevel] });
  }

  // This method queries for metadata related to the given File ID.
  public async findByFileIds(fileIds: string[]): Promise<ImageModelMetadata[]> {
    const fileIdToMetadata = this.querier.queryByFileIds(fileIds);
    return await this.querier.transformFileMetadataIntoTable(fileIdToMetadata);
  }

  // Upload files individually to FSS each as their own independent upload
  // The individual jobs can be grouped by their "serviceFields.groupId"
  public uploadFiles(
    groupId: string,
    filePathToMetadata: FilePathToMetadata
  ): Promise<PromiseSettledResult<UploadMetadataResponse>[]> {
    return Promise.allSettled(
      Object.entries(filePathToMetadata).map(async ([filePath, metadata]) => {
        // Validate metadata
        FileManagementSystem.validateMetadata(filePath, metadata);

        // Get upload directory from FSS
        const initiateUploadResponse = await this.fss.startUpload(
          filePath,
          metadata
        );

        // Add job as child of parent job
        this.jss.updateJob(initiateUploadResponse.jobId, {
          serviceFields: { groupId },
        });

        // Copy upload to directory and inform FSS when complete
        return this.upload(filePath, metadata, initiateUploadResponse);
      })
    );
  }

  public async retryFile(
    groupId: string,
    failedJobId: string
  ): Promise<UploadMetadataResponse> {
    const job = await this.jss.getJob(failedJobId);

    // Verify job has file metadata persisted in serviceFields
    if (!job.serviceFields || isEmpty(job.serviceFields.files)) {
      const error = "Missing file information in job";
      await this.jss.updateJob(failedJobId, {
        status: JSSJobStatus.UNRECOVERABLE,
        serviceFields: { error },
      });
      throw new UnrecoverableJobError(error);
    }

    const metadata: UploadMetadata = job.serviceFields.files[0];

    // Get upload directory from FSS
    const initiateUploadResponse = await this.fss.startUpload(
      metadata.file.originalPath,
      metadata
    );

    // Add job as child of parent job & remove old job as child of parent job
    this.jss.updateJob(initiateUploadResponse.jobId, {
      serviceFields: { groupId },
    });
    // TODO: Isn't there already a replaced flag?
    this.jss.updateJob(failedJobId, { serviceFields: { replaced: true } });

    // Copy upload to directory and inform FSS when complete
    return this.upload(
      metadata.file.originalPath,
      metadata,
      initiateUploadResponse
    );
  }

  public async cancelUpload(jobId: string, filePath: string): Promise<void> {
    this.copier.cancel(filePath);
    // TODO: What to do to cancel?
    await this.jss.updateJob(jobId, {
      status: JSSJobStatus.UNRECOVERABLE,
      serviceFields: { cancelled: true },
    });
  }

  private async upload(
    filePath: string,
    metadata: UploadMetadata,
    initiateUploadResponse: StartUploadResponse
  ): Promise<UploadMetadataResponse> {
    try {
      const fileName = path.basename(filePath);

      // Copy file to upload directory using a web worker
      const md5 = await this.copier.copy(
        filePath,
        initiateUploadResponse.uploadDirectory
      );

      const existsInLK = await this.lk.existsByFileNameAndMD5(fileName, md5);
      if (existsInLK) {
        throw new Error(getFileAlreadyExistsMessage(fileName));
      }

      // Update job with copy completion status
      await this.jss.updateJob(initiateUploadResponse.jobId, {
        serviceFields: { clientSideCopyComplete: true },
      });

      // Notify FSS that file has been copied over
      return await this.fss.completeClientSideOfUpload(filePath, metadata);
    } catch (err) {
      this.logger.error(`Failed to upload ${filePath}: ${err.message}`);
      this.jss.updateJob(initiateUploadResponse.jobId, {
        status: JSSJobStatus.FAILED,
        serviceFields: { error: err.message },
      });
      throw err;
    }
  }
}
