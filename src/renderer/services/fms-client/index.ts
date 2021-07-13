import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

import { noop, uniq, throttle } from "lodash";
import * as hash from "object-hash";
import * as rimraf from "rimraf";
import * as uuid from "uuid";

import { USER_SETTINGS_KEY } from "../../../shared/constants";
import { LocalStorage } from "../../types";
import { makePosixPathCompatibleWithPlatform } from "../../util";
import FileStorageClient, {
  FSSRequestFile,
  StartUploadResponse,
  UploadMetadataResponse,
} from "../fss-client";
import JobStatusClient from "../job-status-client";
import { JSSJob, JSSJobStatus, UploadStage } from "../job-status-client/types";
import LabkeyClient from "../labkey-client";
import { UploadRequest, UploadServiceFields } from "../types";

import { CopyCancelledError } from "./CopyCancelledError";
import FileCopier from "./FileCopier";
import {
  UnrecoverableJobError,
  UNRECOVERABLE_JOB_ERROR,
} from "./UnrecoverableJobError";

const fsExists = promisify(fs.exists);

interface FileManagementSystemConfig {
  fss: FileStorageClient;
  jss: JobStatusClient;
  lk: LabkeyClient;
  storage: LocalStorage;
  fileCopier: FileCopier;
}

type CopyProgressCallBack = (
  originalFilePath: string,
  bytesCopied: number,
  totalBytes: number
) => void;

/*
    Service entity for storing or retrieving files from the AICS FMS. This
    class is responsible for abstracting the work needed to upload a file into
    the FMS.
*/
export default class FileManagementSystem {
  private static readonly DEFAULT_MOUNT_POINT = "/allen/aics";
  private readonly fss: FileStorageClient;
  private readonly jss: JobStatusClient;
  private readonly lk: LabkeyClient;
  private readonly storage: LocalStorage;
  private readonly fileCopier: FileCopier;

  // Creates JSS friendly unique ids
  public static createUniqueId() {
    return uuid.v1().replace(/-/g, "");
  }

  public constructor(config: FileManagementSystemConfig) {
    this.fss = config.fss;
    this.jss = config.jss;
    this.lk = config.lk;
    this.storage = config.storage;
    this.fileCopier = config.fileCopier;
  }

  /**
   * This informs FSS of the file we want to upload & retrieves an upload directory for
   * the client to start physically copying the files to.
   *
   * Throws error if a file was not found or the metadata is malformed
   */
  public async startUpload(
    filePath: string,
    metadata: UploadRequest,
    serviceFields: Partial<UploadServiceFields> = {}
  ): Promise<StartUploadResponse> {
    console.log("Received startUpload request", metadata);

    // Validate the metadata - ensuring the job is trackable
    if (!(await fsExists(filePath))) {
      throw new Error(`Can not find file: ${filePath}`);
    }
    if (!metadata.file) {
      throw new Error(
        `Metadata for file ${filePath} is missing the property file`
      );
    }
    if (!metadata.file.fileType) {
      throw new Error(
        `Metadata for file ${filePath} is missing the property file.fileType`
      );
    }
    if (!metadata.file.originalPath) {
      throw new Error(
        `Metadata for file ${filePath} is missing the property file.originalPath`
      );
    }
    if (metadata.file.originalPath !== filePath) {
      throw new Error(
        `Metadata for file ${filePath} has property file.originalPath set to ${metadata.file.originalPath} which doesn't match ${filePath}`
      );
    }

    // Request FSS for the incoming directory, initiating the job
    const response = await this.fss.startUpload(
      filePath,
      metadata,
      serviceFields
    );

    // Ensure upload job exists before ensuring upload has started
    await this.jss.waitForJobToExist(response.jobId);

    return response;
  }

  /**
   * This copies files from the initiated upload to the directory supplied &
   * then informs FSS that the client's part of the upload is now complete.
   */
  public async uploadFile(
    jobId: string,
    filePath: string,
    metadata: UploadRequest,
    uploadDirectory: string,
    copyProgressCb: CopyProgressCallBack = noop
  ): Promise<UploadMetadataResponse> {
    try {
      // Physically copy the file to the supplied directory, retrieving the MD5
      const md5 = await this.copyFile(
        jobId,
        filePath,
        uploadDirectory,
        copyProgressCb
      );

      // Update the job with the MD5 to provide a shortcut in case
      // the user retries the job later on after a failure scenario
      const jobUpdate = {
        serviceFields: { md5: { [hash.MD5(filePath)]: md5 } },
      };
      await this.jss.updateJob(jobId, jobUpdate, true);

      // Inform FSS that the client side of the upload has completed
      const file: FSSRequestFile = {
        fileName: path.basename(filePath),
        fileType: metadata.file.fileType,
        md5hex: md5,
        metadata: {
          ...metadata,
          file: {
            ...metadata.file,
            fileName: path.basename(filePath),
            originalPath: filePath,
          },
        },
        shouldBeInArchive: metadata.file.shouldBeInArchive,
        shouldBeInLocal: metadata.file.shouldBeInLocal,
      };
      const response = await this.fss.uploadComplete(jobId, [file]);

      // Update Job stage to reflect completion of client copy
      // in the event FSS is too busy to process the upload immediately
      // i.e. leaving the stage otherwise stagnant & false
      await this.jss.updateJob(jobId, {
        currentStage: UploadStage.WAITING_FOR_FSS_PROCESSING,
      });
      return response;
    } catch (e) {
      await this.jss.updateJob(jobId, {
        status: JSSJobStatus.FAILED,
        serviceFields: {
          error: e.message,
        },
      });
      throw e;
    }
  }

  /**
   * Retry the given job from scratch as a new job.
   * Re-using the same job is not possible as it could lead
   * to an automatic rejection on the server-side for being
   * a stale or otherwise unrecoverable job.
   */
  public async retryUpload(
    jobId: string,
    copyProgressCb: (jobId: string) => CopyProgressCallBack
  ): Promise<UploadMetadataResponse[]> {
    console.info(`Retrying upload for jobId=${jobId}.`);

    try {
      // Request job from JSS & validate if it is retryable
      const job: JSSJob<UploadServiceFields> = await this.jss.getJob(jobId);
      await this.validateUploadJobForRetry(job);

      // Start new upload jobs that will replace the current one
      const newJobServiceFields = {
        groupId:
          job.serviceFields?.groupId || FileManagementSystem.createUniqueId(),
        originalJobId: jobId,
      };

      // Create a separate upload for each file in this job
      // One job for multiple files is deprecated, this is here
      // for backwards-compatibility
      const results = await Promise.all(
        (job.serviceFields?.files || []).map(async (file) => {
          try {
            // Get the upload directory
            const newUploadResponse = await this.startUpload(
              file.file.originalPath,
              file,
              newJobServiceFields
            );

            try {
              // Update the current job with information about the replacement
              const oldJobPatch = {
                serviceFields: {
                  error: `This job has been replaced with Job ID: ${newUploadResponse.jobId}`,
                  replacementJobIds: uniq([
                    ...(job?.serviceFields?.replacementJobIds || []),
                    newUploadResponse.jobId,
                  ]),
                },
              };
              await this.jss.updateJob(jobId, oldJobPatch, false);

              // Perform upload with new job and current job's metadata, forgoing the current job
              return await this.uploadFile(
                newUploadResponse.jobId,
                file.file.originalPath,
                file,
                newUploadResponse.uploadDirectory,
                copyProgressCb(newUploadResponse.jobId)
              );
            } catch (error) {
              await this.jss.updateJob(newUploadResponse.jobId, {
                status:
                  error.name === UNRECOVERABLE_JOB_ERROR
                    ? JSSJobStatus.UNRECOVERABLE
                    : JSSJobStatus.FAILED,
                serviceFields: { error: error.message },
              });
              throw error;
            }
          } catch (error) {
            return { error };
          }
        })
      );

      // This ensures each upload promise is able to complete before
      // evaluating any failures (similar to Promise.allSettled)
      return results.map((result) => {
        const errorCase = result as { error: Error };
        if (errorCase.error) {
          throw errorCase.error;
        }
        return result as UploadMetadataResponse;
      });
    } catch (e) {
      await this.jss.updateJob(jobId, {
        status:
          e.name === UNRECOVERABLE_JOB_ERROR
            ? JSSJobStatus.UNRECOVERABLE
            : JSSJobStatus.FAILED,
        serviceFields: {
          error: e.message,
        },
      });
      throw e;
    }
  }

  /**
   * Cancels the given Job. This will mark the job as a failure and
   * stop the copy portion of the upload if ongoing on the client side.
   * Note: the job is not guaranteed to stop if it has left the
   * client-side portion of the upload and is now entirely managed by FSS.
   */
  public async cancelUpload(jobId: string): Promise<void> {
    this.fileCopier.cancelCopy(jobId);

    await this.jss.updateJob(jobId, {
      status: JSSJobStatus.FAILED,
      serviceFields: { cancelled: true, error: "Cancelled by user" },
    });
  }

  /**
   * Copies the given source file to the destination folder updating
   * the copy progress via the supplied callback throughout.
   */
  private async copyFile(
    jobId: string,
    source: string,
    dest: string,
    copyProgressCb: CopyProgressCallBack
  ): Promise<string> {
    const fileStats = await fs.promises.stat(source);
    const fileSize = fileStats.size;
    const fileName = path.basename(source);

    const userSettings = this.storage.get(USER_SETTINGS_KEY);
    const mountPoint =
      userSettings?.mountPoint || FileManagementSystem.DEFAULT_MOUNT_POINT;
    let targetFolder = dest.replace(
      FileManagementSystem.DEFAULT_MOUNT_POINT,
      mountPoint
    );
    targetFolder = makePosixPathCompatibleWithPlatform(
      targetFolder,
      process.platform
    );
    try {
      // Update copy progress every 5 seconds
      const throttledProgress = throttle(
        (progress) => copyProgressCb(source, progress, fileSize),
        5000
      );
      console.time(`Copy ${source}`);
      const md5 = await this.fileCopier.copyToDestAndCalcMD5(
        jobId,
        source,
        targetFolder,
        throttledProgress
      );
      console.timeEnd(`Copy ${source}`);
      // Flush out the last call so completed progress is shown immediately
      throttledProgress.flush();
      if (process.platform === "darwin") {
        const toRemove = path.resolve(targetFolder, `._${fileName}`);
        try {
          rimraf.sync(toRemove);
        } catch (e) {
          console.error(`Failed to remove ${toRemove}` + e.message);
        }
      }
      return md5;
    } catch (e) {
      if (e instanceof CopyCancelledError) {
        console.warn(e.message);
      } else {
        console.error(`Error while copying file ${source}`, e);
      }
      throw e;
    }
  }

  /**
   * Validates the given job for retry throwing an error if
   * it is not deemed capable of being retried at this time.
   */
  private async validateUploadJobForRetry(
    job: JSSJob<UploadServiceFields>
  ): Promise<void> {
    if (
      [
        JSSJobStatus.UNRECOVERABLE,
        JSSJobStatus.WORKING,
        JSSJobStatus.RETRYING,
        JSSJobStatus.BLOCKED,
        JSSJobStatus.SUCCEEDED,
      ].includes(job.status)
    ) {
      throw new Error(
        `Can't retry this upload job because the status is ${job.status}.`
      );
    }

    if (!job.serviceFields || !job.serviceFields.files?.length) {
      throw new UnrecoverableJobError(
        "Missing crucial upload data (serviceFields.files)"
      );
    }

    const { lastModified, md5 } = job.serviceFields;
    // Older uploads might not have these fields. we cannot do a duplicate check at this point if that is the case.
    if (!lastModified || !md5) {
      return;
    }

    // Prevent duplicate files from getting uploaded ASAP
    // We can do this if MD5 has already been calculated for a file and the file has not been modified since then
    for (const file of job.serviceFields.files) {
      const currLastModified = lastModified[hash.MD5(file.file.originalPath)];
      const currMD5 = md5[hash.MD5(file.file.originalPath)];
      if (currLastModified && currMD5) {
        const stats = await fs.promises.stat(file.file.originalPath);
        if (stats.mtime.getTime() === new Date(currLastModified).getTime()) {
          if (
            await this.lk.getFileExistsByMD5AndName(
              currMD5,
              path.basename(file.file.originalPath)
            )
          ) {
            throw new Error(
              `${path.basename(
                file.file.originalPath
              )} has already been uploaded to FMS.`
            );
          }
        }
      }
    }
  }
}
