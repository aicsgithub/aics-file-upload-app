import { readdir as fsReaddir, unlink as fsUnlink } from "fs";
import { basename, resolve } from "path";
import { promisify } from "util";

import * as Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import { isEmpty, noop } from "lodash";

import JobStatusClient from "../../job-status-client";
import { AsyncJSSJob, JSSJobStatus } from "../../job-status-client/types";
import { AICSFILES_LOGGER } from "../constants";
import { IllegalArgumentError } from "../errors";
import { StepExecutor } from "../helpers/step-executor";
import {
  CopyFilesServiceFields,
  SourceFiles,
  Step,
  StepName,
  UploadContext,
} from "../types";

import { CopyStep } from "./copy-step";

const readdir = promisify(fsReaddir);
const unlink = promisify(fsUnlink);
export interface CopyFilesFileSystemUtil {
  readdir: typeof readdir;
  unlink: typeof unlink;
}

// Step 1/2 in which files are copied to a location on the isilon
export class CopyFilesStep implements Step {
  public readonly job: AsyncJSSJob<CopyFilesServiceFields>;
  public readonly name: StepName = StepName.CopyFiles;
  private readonly jss: JobStatusClient;
  private readonly logger: ILogger;
  private readonly onCopyFileProgress: (
    originalFilePath: string,
    bytesCopied: number,
    totalBytes: number
  ) => void;
  private readonly copyProgressCbThrottleMs: number | undefined;
  private getCopyWorker: () => Worker;
  private fs: CopyFilesFileSystemUtil;

  public constructor(
    job: AsyncJSSJob<CopyFilesServiceFields>,
    jss: JobStatusClient,
    getCopyWorker: () => Worker,
    logger: ILogger = Logger.get(AICSFILES_LOGGER),
    onCopyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number,
    fs: CopyFilesFileSystemUtil = { readdir, unlink }
  ) {
    this.job = job;
    this.jss = jss;
    this.getCopyWorker = getCopyWorker;
    this.logger = logger;
    this.onCopyFileProgress = onCopyProgressCb;
    this.copyProgressCbThrottleMs = copyProgressCbThrottleMs;
    this.fs = fs;
  }

  public start = async (ctx: UploadContext): Promise<UploadContext> => {
    if (isEmpty(ctx.copyChildJobs) || !ctx.copyChildJobs) {
      throw new Error("Context is missing copyChildJobs");
    }

    // Removes unwanted files from upload directory. Otherwise, FSS complains with a 417 response.
    await this.removeUnexpectedFiles(ctx);

    const steps: Step[] = ctx.copyChildJobs.map(
      (j) =>
        new CopyStep(
          j,
          this.jss,
          this.getCopyWorker,
          this.logger,
          undefined,
          this.onCopyFileProgress,
          this.copyProgressCbThrottleMs
        )
    );
    return await StepExecutor.executeStepsInParallel(this.jss, steps, ctx).then(
      (ctxs: UploadContext[]) =>
        ctxs.reduce(
          (partialCtx, currentCtx) => ({
            ...currentCtx,
            ...partialCtx,
            sourceFiles: {
              ...currentCtx.sourceFiles,
              ...partialCtx.sourceFiles,
            },
          }),
          ctx
        )
    );
  };

  // This an `async` method because it overrides Step.skip
  // eslint-disable-next-line @typescript-eslint/require-await
  public skip = async (ctx: UploadContext): Promise<UploadContext> => {
    if (!ctx.copyChildJobs) {
      throw new IllegalArgumentError("Context is missing copyChildJobs");
    }

    const childJobs = ctx.copyChildJobs;
    const incompleteChildJobs = childJobs.filter(
      (j) =>
        j.status !== JSSJobStatus.SUCCEEDED ||
        !j.serviceFields ||
        !j.serviceFields.output
    );
    if (incompleteChildJobs.length > 0) {
      this.logger.error("Found incomplete child jobs", incompleteChildJobs);
      throw new IllegalArgumentError(
        "There are incomplete jobs",
        incompleteChildJobs
      );
    }

    return {
      ...ctx,
      sourceFiles: childJobs.reduce(
        (sourceFiles: SourceFiles, job: AsyncJSSJob) => ({
          ...sourceFiles,
          ...job.serviceFields.output,
        }),
        {}
      ),
    };
  };

  public end = async (ctx: UploadContext): Promise<void> => {
    if (!ctx.sourceFiles) {
      throw new IllegalArgumentError("sourceFiles missing from context");
    }

    try {
      await this.jss.updateJob(
        this.job.jobId,
        {
          serviceFields: {
            output: ctx.sourceFiles,
          },
          status: JSSJobStatus.SUCCEEDED,
        },
        true
      );
    } catch (e) {
      const error = `Could not update the copy files job ${this.job.jobId} while ending the copy files step`;
      this.logger.error(error, e.response);
      throw new Error(error);
    }
  };

  private removeUnexpectedFiles = async (ctx: UploadContext): Promise<void> => {
    const filesInUploadDir = await this.fs.readdir(
      ctx.startUploadResponse.uploadDirectory
    );
    const originalPaths = new Set(
      Object.keys(ctx.uploads).map((fullpath) => basename(fullpath))
    );
    const filesToDelete = filesInUploadDir.filter(
      (file) => !originalPaths.has(file)
    );
    if (filesToDelete.length > 0) {
      this.logger.info(
        `Found unexpected files in upload directory: ${filesToDelete.join(
          ", "
        )}`
      );
      await Promise.all(
        filesToDelete.map((file) =>
          this.fs.unlink(resolve(ctx.startUploadResponse.uploadDirectory, file))
        )
      );
    }
  };
}
