import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

import { noop, uniq } from "lodash";
import * as hash from "object-hash";
import * as rimraf from "rimraf";
import * as uuid from "uuid";
import CopyWorker from "worker-loader!./copy-worker";

import { LabkeyClient } from "..";
import { USER_SETTINGS_KEY } from "../../../shared/constants";
import { LocalStorage } from "../../types";
import {
  UNRECOVERABLE_JOB_ERROR,
  UPLOAD_WORKER_ON_PROGRESS,
  UPLOAD_WORKER_SUCCEEDED,
} from "../aicsfiles/constants";
import { CopyError, InvalidMetadataError } from "../aicsfiles/errors";
import { UnrecoverableJobError } from "../aicsfiles/errors/UnrecoverableJobError";
import {
  CopyProgressCallBack,
  FileMetadata,
  FSSRequestFile,
  StartUploadResponse,
  UploadMetadata,
  UploadMetadataResponse,
  UploadServiceFields,
} from "../aicsfiles/types";
import { FSSClient } from "../fss-client";
import JobStatusClient from "../job-status-client";
import { JSSJob, JSSJobStatus } from "../job-status-client/types";

const fsExists = promisify(fs.exists);

interface FileManagementSystemConfig {
  fss: FSSClient;
  jss: JobStatusClient;
  lk: LabkeyClient;
  storage: LocalStorage;
}

/*
    Service entity for storing or retrieving files from the AICS FMS. This
    class is responsible for abstracting the work needed to upload a file into the
    FMS as well as retrieving the metadata for a file that has been uploaded into the
    FMS.
*/
export default class FileManagementSystem {
  private static readonly DEFAULT_MOUNT_POINT = "/allen/aics";
  private readonly fss: FSSClient;
  private readonly jss: JobStatusClient;
  private readonly lk: LabkeyClient;
  private readonly storage: LocalStorage;
  private jobIdToWorkerMap: { [jobId: string]: Worker } = {};

  // Creates JSS friendly unique ids
  public static createUniqueId() {
    return uuid.v1().replace(/-/g, "");
  }

  public constructor(config: FileManagementSystemConfig) {
    this.fss = config.fss;
    this.jss = config.jss;
    this.lk = config.lk;
    this.storage = config.storage;
  }

  /**
   * This informs FSS of the file we want to upload & retrieves an upload directory for
   * the client to start physically copying the files to.
   *
   * Throws InvalidMetadataError if a file was not found or if more than one files have the same name
   * returns StartUploadResponse
   */
  public async startUpload(
    filePath: string,
    metadata: UploadMetadata,
    serviceFields: Partial<UploadServiceFields> = {}
  ): Promise<StartUploadResponse> {
    console.log("Received uploadFiles request", metadata);

    // Validate the metadata - ensuring the job is trackable
    if (!(await fsExists(filePath))) {
      throw new InvalidMetadataError(`Can not find file: ${filePath}`);
    }
    if (!metadata.file) {
      throw new InvalidMetadataError(
        `Metadata for file ${filePath} is missing the property file`
      );
    }
    if (!metadata.file.fileType) {
      throw new InvalidMetadataError(
        `Metadata for file ${filePath} is missing the property file.fileType`
      );
    }
    if (!metadata.file.originalPath) {
      throw new InvalidMetadataError(
        `Metadata for file ${filePath} is missing the property file.originalPath`
      );
    }
    if (metadata.file.originalPath !== filePath) {
      throw new InvalidMetadataError(
        `Metadata for file ${filePath} has property file.originalPath set to ${filePath} which doesn't match ${filePath}`
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
    metadata: UploadMetadata,
    uploadDirectory: string,
    copyProgressCb: CopyProgressCallBack = noop
  ): Promise<UploadMetadataResponse> {
    console.time("upload");
    try {
      // Remove unwanted files from upload directory. Otherwise, FSS complains with a 417 response.
      const unexpectedFiles = await fs.promises.readdir(uploadDirectory);
      console.log(
        "Removing unexpected files from upload directory",
        unexpectedFiles
      );
      await Promise.all(
        unexpectedFiles.map((file) =>
          fs.promises.unlink(path.resolve(uploadDirectory, file))
        )
      );

      // Physically copy the file to the supplied directory, retrieving the MD5
      const md5 = await this.copyFile(
        jobId,
        filePath,
        uploadDirectory,
        copyProgressCb
      );
      const jobUpdate = {
        serviceFields: { md5: { [hash.MD5(filePath)]: md5 } },
      };
      this.jss.updateJob(jobId, jobUpdate, true);

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
      console.timeEnd("upload");
      return response;
    } catch (e) {
      console.timeEnd("upload");
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
   * Retry the given Job replacing it with a new fresh upload job
   * & performing the upload.
   */
  public async retryUpload(
    jobId: string,
    copyProgressCb: CopyProgressCallBack = noop
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
                copyProgressCb
              );
            } catch (error) {
              await this.jss.updateJob(newUploadResponse.jobId, {
                status:
                  error.name === UNRECOVERABLE_JOB_ERROR
                    ? JSSJobStatus.UNRECOVERABLE
                    : JSSJobStatus.FAILED,
                serviceFields: { error: error.message },
              });
              return { error };
            }
          } catch (error) {
            return { error };
          }
        })
      );

      // This ensures each upload promise is able to complete before
      // evaluating any failures (similar to Promise.allSettled)
      return results.map((result) => {
        if (result.error) {
          throw new Error(result.error);
        }
        const x = result;
        return x as UploadMetadataResponse;
      });
    } catch (e) {
      console.timeEnd("upload");
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
   * Fetches the metadata for the given file.
   */
  public async findByFileId(fileId: string): Promise<FileMetadata> {
    throw new Error("TBD");
  }

  /**
   * Cancels the given Job. This will mark the job as a failure and
   * stop the copy portion of the upload. Note: the job is not guaranteed
   * to stop if it has left the client-side upload portion of the upload and
   * is being entirely managed by FSS.
   */
  public async cancelUpload(jobId: string): Promise<void> {
    if (this.jobIdToWorkerMap[jobId]) {
      this.jobIdToWorkerMap[jobId].terminate();
      delete this.jobIdToWorkerMap[jobId];
    }
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
    if (process.platform === "win32") {
      targetFolder = targetFolder.replace(/\//g, "\\");
      if (targetFolder.startsWith("\\allen")) {
        targetFolder = `\\${targetFolder}`;
      }
    }

    // Copy worker internals defined in `./copy-worker.ts`
    const worker = new CopyWorker();
    this.jobIdToWorkerMap[jobId] = worker;
    return new Promise<string>((resolve, reject) => {
      // Receive messages from the worker. Each message should be formatted
      // like <message_type>:<message> (ex. "upload-progress:111" where the type
      // is that the copy is in progress and message is the amount of bytes copied so far)
      worker.onmessage = (e: MessageEvent<string>) => {
        const message = e?.data.toLowerCase();
        console.info(message);

        if (message.includes(UPLOAD_WORKER_SUCCEEDED)) {
          // https://apple.stackexchange.com/questions/14980/why-are-dot-underscore-files-created-and-how-can-i-avoid-them
          if (process.platform === "darwin") {
            const toRemove = path.resolve(targetFolder, `._${fileName}`);
            try {
              rimraf.sync(toRemove);
            } catch (e) {
              console.error(`Failed to remove ${toRemove}` + e.message);
            }
          }

          const md5 = message.split(":")[1];
          delete this.jobIdToWorkerMap[jobId];
          resolve(md5);
        } else if (message.includes(UPLOAD_WORKER_ON_PROGRESS)) {
          const info = e.data.split(":");
          if (info.length === 2) {
            try {
              copyProgressCb(source, parseInt(info[1], 10), fileSize);
            } catch (e) {
              console.error("Could not parse JSON progress info", e);
            }
          }
        }
      };

      // Reject the promise (i.e. throwing an error) on failure
      worker.onerror = (e: ErrorEvent) => {
        console.error(`Error while copying file ${source}`, e);
        delete this.jobIdToWorkerMap[jobId];
        reject(new CopyError(e.message));
      };

      // Send the source file and formatted destination to the worker
      worker.postMessage([source, targetFolder]);
    });
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
