import * as path from "path";

import * as Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import { noop } from "lodash";
import * as rimraf from "rimraf";

import JobStatusClient from "../../job-status-client";
import { CopyError, IllegalArgumentError } from "../errors";
import { AICSFILES_LOGGER } from "../file-management-system";
import { Job, Step, StepName, UploadContext } from "../types";
import { makePosixPathCompatibleWithPlatform } from "../util";

import cpy from "./copy-and-calc-md5";

const getCopyFileTimerName = (jobId: string, originalPath: string): string =>
  `Copy ${originalPath} to incoming directory for copy child job ${jobId}`;

// Child step of the CopyFilesStep in which a file is copied to the isilon
export class CopyStep implements Step {
  public readonly job: Job;
  public readonly name = StepName.CopyFilesChild;
  private readonly logger: ILogger;
  private readonly forceRemoveRecursive: typeof rimraf;
  private readonly copyFiles: typeof cpy;
  private readonly onCopyFileProgress: (
    originalFilePath: string,
    bytesCopied: number,
    totalBytes: number
  ) => void;
  private readonly copyProgressCbThrottleMs: number | undefined;

  private readonly jss: JobStatusClient;

  public constructor(
    job: Job,
    jss: JobStatusClient,
    logger: ILogger = Logger.get(AICSFILES_LOGGER),
    forceRemoveRecursive: typeof rimraf = rimraf,
    copyFiles: typeof cpy = cpy,
    onCopyFileProgress: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ) {
    this.job = job;
    this.jss = jss;
    this.logger = logger;
    this.forceRemoveRecursive = forceRemoveRecursive;
    this.copyFiles = copyFiles;
    this.onCopyFileProgress = onCopyFileProgress;
    this.copyProgressCbThrottleMs = copyProgressCbThrottleMs;
  }

  public start = async (ctx: UploadContext): Promise<UploadContext> => {
    if (!this.job.serviceFields || !this.job.serviceFields.originalPath) {
      throw new IllegalArgumentError("Copy job does not include original path");
    }

    const { uploads } = ctx;
    const { uploadDirectory } = ctx.startUploadResponse;
    const platform = process.platform;
    const originalPath = this.job.serviceFields.originalPath;
    const basename = path.basename(originalPath);
    const metadata = uploads[originalPath];
    const { fileType, shouldBeInArchive, shouldBeInLocal } = metadata.file;

    this.logger.time(getCopyFileTimerName(this.job.jobId, originalPath));
    const targetFolder = makePosixPathCompatibleWithPlatform(
      uploadDirectory,
      platform
    );
    try {
      // await new Promise(r => setTimeout(r, 10000));
      // throw new Error("Mock error during copy");
      const md5 = await this.copyFiles(
        originalPath,
        targetFolder,
        this.reportProgress(ctx.totalBytesToCopy),
        this.copyProgressCbThrottleMs
      );
      // https://apple.stackexchange.com/questions/14980/why-are-dot-underscore-files-created-and-how-can-i-avoid-them
      if (platform === "darwin") {
        const toRemove = path.resolve(uploadDirectory, `._${basename}`);
        try {
          this.forceRemoveRecursive.sync(toRemove);
        } catch (e) {
          this.logger.error(`Failed to remove ${toRemove}` + e.message);
        }
      }
      this.logger.timeEnd(getCopyFileTimerName(this.job.jobId, originalPath));
      return {
        ...ctx,
        sourceFiles: {
          [originalPath]: {
            fileName: basename,
            fileType,
            md5hex: md5,
            metadata: {
              ...metadata,
              file: {
                ...metadata.file,
                fileName: basename,
                fileType,
                originalPath,
              },
            },
            shouldBeInArchive,
            shouldBeInLocal,
          },
        },
      };
    } catch (e) {
      this.logger.timeEnd(getCopyFileTimerName(this.job.jobId, originalPath));
      this.logger.error(`Error while copying file ${originalPath}`, e);
      throw new CopyError(e.message);
    }
  };

  // This an `async` method because it overrides Step.skip
  // eslint-disable-next-line @typescript-eslint/require-await
  public skip = async (ctx: UploadContext): Promise<UploadContext> => {
    if (this.job.serviceFields && this.job.serviceFields.output) {
      return {
        ...ctx,
        sourceFiles: this.job.serviceFields.output,
      };
    }

    throw new IllegalArgumentError("job.serviceFields.output was undefined");
  };

  public end = async (ctx: UploadContext): Promise<void> => {
    if (!ctx.sourceFiles) {
      throw new IllegalArgumentError("sourceFiles missing from context");
    }

    if (!this.job.serviceFields || !this.job.serviceFields.originalPath) {
      throw new IllegalArgumentError("Copy job does not include original path");
    }

    const originalPath = this.job.serviceFields.originalPath;

    try {
      await this.jss.updateJob(
        this.job.jobId,
        {
          serviceFields: {
            output: {
              [originalPath]: ctx.sourceFiles[originalPath],
            },
          },
          status: "SUCCEEDED",
        },
        true
      );
    } catch (e) {
      const error = `Failed to update the copy step job ${this.job.jobId} while ending the copy step`;
      this.logger.error(error, e.response);
      throw new Error(error);
    }
  };

  private reportProgress = (totalBytesToCopy?: number) => {
    return (bytesCopied: number): void =>
      this.onCopyFileProgress(
        this.job.serviceFields.originalPath,
        bytesCopied,
        totalBytesToCopy || 0
      );
  };
}
