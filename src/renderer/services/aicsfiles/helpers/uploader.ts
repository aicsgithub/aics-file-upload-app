import { stat as fsStat } from "fs";
import { hostname, platform, userInfo } from "os";
import { promisify } from "util";

import * as Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import { uniq } from "lodash";
import { includes, keys, noop } from "lodash";
import * as uuid from "uuid";

import { USER_SETTINGS_KEY } from "../../../../shared/constants";
import { LocalStorage } from "../../../types";
import JobStatusClient from "../../job-status-client";
import {
  CreateJobRequest,
  JobBase,
  JSSJob,
  JSSJobStatus,
} from "../../job-status-client/types";
import { AICSFILES_LOGGER } from "../constants";
import { UnrecoverableJobError } from "../errors/UnrecoverableJobError";
import { AddMetadataStep } from "../steps/add-metadata-step";
import { CopyFilesStep } from "../steps/copy-files-step";
import {
  FSSResponseFile,
  StartUploadResponse,
  Step,
  StepName,
  UploadChildJobServiceFields,
  UploadContext,
  UploadResponse,
  Uploads,
} from "../types";
import { makePosixPathCompatibleWithPlatform } from "../util";

import { FSSClient } from "./fss-client";
import { StepExecutor } from "./step-executor";

const EXPECTED_NUMBER_UPLOAD_STEPS = 2;
export const COPY_TYPE = "copy";
export const COPY_CHILD_TYPE = "copy_child";
export const ADD_METADATA_TYPE = "add_metadata";
const stat = promisify(fsStat);

const getUUID = (): string => {
  // JSS does not allow hyphenated GUIDS.
  return uuid.v1().replace(/-/g, "");
};

/**
 * This class is responsible for uploading files through FSS.
 */
export class Uploader {
  private readonly fss: FSSClient;
  private readonly jss: JobStatusClient;
  private readonly storage: LocalStorage;
  private readonly logger: ILogger;

  private readonly getCopyWorker: () => Worker;
  private readonly defaultMountPoint = "/allen/aics";

  private get defaultJobInfo(): JobBase {
    return {
      currentHost: hostname(),
      originationHost: hostname(),
      service: "aicsfiles-js",
      status: JSSJobStatus.WAITING,
      updateParent: true,
      user: this.username,
    };
  }

  private get mountPoint() {
    const userSettings = this.storage.get(USER_SETTINGS_KEY);
    return makePosixPathCompatibleWithPlatform(
      userSettings?.mountPoint || this.defaultMountPoint,
      platform()
    );
  }

  private get username() {
    const userSettings = this.storage.get(USER_SETTINGS_KEY);
    return userSettings?.username || userInfo().username;
  }

  public constructor(
    getCopyWorker: () => Worker,
    fss: FSSClient,
    jobStatusClient: JobStatusClient,
    storage: LocalStorage,
    logger: ILogger = Logger.get(AICSFILES_LOGGER)
  ) {
    this.getCopyWorker = getCopyWorker;
    this.fss = fss;
    this.jss = jobStatusClient;
    this.storage = storage;
    this.logger = logger;
  }

  private async executeSteps(
    ctx: UploadContext,
    steps: Step[]
  ): Promise<UploadResponse> {
    // Fix the upload directory for users who have a non-standard a mount point (such as those with Macs)
    ctx.startUploadResponse.uploadDirectory = ctx.startUploadResponse.uploadDirectory.replace(
      this.defaultMountPoint,
      this.mountPoint
    );

    const updatedCtx = await StepExecutor.executeSteps(this.jss, steps, ctx);

    // Converts an array of files to an object where the keys are the fileName and the values are the file
    return this.mapToResponse(updatedCtx.resultFiles || []);
  }

  public async uploadFiles(
    startUploadResponse: StartUploadResponse,
    uploads: Uploads,
    uploadJobName: string,
    copyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ): Promise<UploadResponse> {
    const { ctx, jobs: childJobs } = await this.getUploadChildJobs({
      startUploadResponse,
      uploads,
      uploadJobName,
    });
    const steps: Step[] = this.getSteps(
      childJobs,
      this.getCopyWorker,
      copyProgressCb,
      copyProgressCbThrottleMs
    );

    return this.executeSteps(ctx, steps);
  }

  /**
   * Uploads files through FSS.
   * @param uploads a map of local file paths and metadata
   * @param uploadJob Job to retry
   * @param copyProgressCb callback on copy progress
   * @param copyProgressCbThrottleMs minimum amount of ms between calls to copyProgressCb
   */
  public async retryUpload(
    uploads: Uploads,
    uploadJob: JSSJob,
    copyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ): Promise<UploadResponse> {
    this.validateUploadJob(uploadJob);

    if (uploadJob.status === JSSJobStatus.SUCCEEDED) {
      // if upload job already succeeded, we'll just return what is stored as output on the job
      return uploadJob.serviceFields?.output ?? {};
    }

    await this.jss.updateJob(uploadJob.jobId, {
      status: JSSJobStatus.RETRYING,
    });

    const originalUploadResponse: StartUploadResponse = {
      jobId: uploadJob.jobId,
      uploadDirectory: uploadJob.serviceFields.uploadDirectory,
    };
    const uploadJobName = uploadJob.jobName || "default upload name";

    const { ctx, jobs: childJobs } = await this.getUploadChildJobs({
      startUploadResponse: originalUploadResponse,
      uploads,
      uploadJobName,
      uploadJob,
    });

    const steps: Step[] = this.getSteps(
      childJobs,
      this.getCopyWorker,
      copyProgressCb,
      copyProgressCbThrottleMs
    );
    const jobCompleted = steps.every(
      ({ job: { status }, name }) =>
        status === JSSJobStatus.SUCCEEDED || name === StepName.AddMetadata
    );

    if (jobCompleted && uploadJob.status === JSSJobStatus.FAILED) {
      this.logger.info(
        "Current upload failed too late in the process to retry, replacing with new job"
      );
      // Start new upload job that will replace the current one
      const newUploadResponse = await this.fss.startUpload(
        uploads,
        uploadJobName
      );
      // Update the current job with information about the replacement
      await Promise.all([
        this.jss.updateJob(
          uploadJob.jobId,
          {
            serviceFields: {
              error: `This job has been replaced with Job ID: ${newUploadResponse.jobId}`,
              replacementJobIds: uniq([
                ...(uploadJob?.serviceFields?.replacementJobIds || []),
                newUploadResponse.jobId,
              ]),
            },
          },
          true
        ),
        this.jss.updateJob(
          newUploadResponse.jobId,
          {
            serviceFields: {
              originalJobId: uploadJob.jobId,
            },
          },
          true
        ),
      ]);
      // Perform upload with new job and current job's metadata, forgoing the current job
      return this.uploadFiles(newUploadResponse, uploads, uploadJobName);
    }

    return this.executeSteps(ctx, steps);
  }

  private validateUploadJob(job: JSSJob): void {
    if (
      includes(
        [
          JSSJobStatus.UNRECOVERABLE,
          JSSJobStatus.WORKING,
          JSSJobStatus.RETRYING,
          JSSJobStatus.BLOCKED,
        ],
        job.status
      )
    ) {
      throw new Error(
        `Can't retry this upload job because the status is ${job.status}.`
      );
    }

    if (!job.serviceFields.uploadDirectory) {
      throw new UnrecoverableJobError(
        "Upload job is missing serviceFields.uploadDirectory"
      );
    }
  }

  private async getUploadChildJobs(
    ctx: UploadContext
  ): Promise<{ jobs: JSSJob[]; ctx: UploadContext }> {
    if (ctx.uploadJob) {
      this.logger.info("Getting existing upload jobs");
      return this.getExistingUploadJobs(ctx);
    }

    this.logger.info("Creating upload jobs");
    return this.createUploadJobs(ctx);
  }

  private async getExistingUploadJobs(
    ctx: UploadContext
  ): Promise<{
    jobs: JSSJob<UploadChildJobServiceFields>[];
    ctx: UploadContext;
  }> {
    const { uploadJob, uploads } = ctx;
    if (!uploadJob) {
      throw new Error("No upload job provided");
    }

    if (!uploadJob.childIds || uploadJob.childIds.length === 0) {
      this.logger.warn(
        "Upload job provided does not include childIds - creating child jobs"
      );
      return this.createUploadJobs(ctx);
    }

    if (uploadJob.childIds.length !== EXPECTED_NUMBER_UPLOAD_STEPS) {
      throw new UnrecoverableJobError(
        `Expected ${EXPECTED_NUMBER_UPLOAD_STEPS} childIds on uploadJob but got: ${uploadJob.childIds.length}`
      );
    }

    try {
      const childJobs = await this.jss.getJobs({
        jobId: {
          $in: uploadJob.childIds,
        },
        user: this.username,
      });

      if (childJobs.length !== EXPECTED_NUMBER_UPLOAD_STEPS) {
        throw new UnrecoverableJobError(
          `Was expecting to retrieve ${EXPECTED_NUMBER_UPLOAD_STEPS} child steps for upload. Retrieved ${childJobs.length}.`
        );
      }

      const copyJob = childJobs.find(
        (j) => j.serviceFields && j.serviceFields.type === COPY_TYPE
      );
      if (!copyJob) {
        throw new UnrecoverableJobError("Could not find the parent copy job.");
      }

      const copyChildJobs = await this.jss.getJobs({
        jobId: {
          $in: copyJob.childIds,
        },
        user: this.username,
      });

      const expectedNumberCopyChildJobs = keys(uploads).length;
      if (copyChildJobs.length !== expectedNumberCopyChildJobs) {
        throw new UnrecoverableJobError(
          `Was expecting to retrieve ${expectedNumberCopyChildJobs} but instead retrieved ${copyChildJobs.length}`
        );
      }
      if (copyChildJobs.find((j) => !j.serviceFields?.originalPath)) {
        throw new UnrecoverableJobError(
          `One or more copy child jobs are missing originalPath`
        );
      }
      const fileToSizeMap = await this.getFileSizes(uploads);
      return {
        ctx: {
          ...ctx,
          copyChildJobs,
          totalBytesToCopy: this.getTotalBytesToCopy(fileToSizeMap),
          uploadChildJobIds: uploadJob.childIds,
        },
        jobs: childJobs,
      };
    } catch (e) {
      const childIds = uploadJob.childIds || [];
      const error = `Failed to get upload job children: ${childIds.join(", ")}`;
      this.logger.error(error, e.response);
      throw e;
    }
  }

  private async getFileSizes(uploads: Uploads): Promise<Map<string, number>> {
    const fileToSizeMap = new Map();
    for (const [filePath] of Object.entries(uploads)) {
      const stats = await stat(filePath);
      fileToSizeMap.set(filePath, stats.size);
    }
    return fileToSizeMap;
  }
  private getTotalBytesToCopy(fileToSizeMap: Map<string, number>): number {
    return [...fileToSizeMap.values()].reduce(
      (byteCount: number, size: number) => byteCount + size,
      0
    );
  }

  private async createUploadJobs(
    ctx: UploadContext
  ): Promise<{ jobs: JSSJob[]; ctx: UploadContext }> {
    const { startUploadResponse, uploads } = ctx;
    const parentId = startUploadResponse.jobId;
    const uploadChildJobIds = [getUUID(), getUUID()];
    const fileToSizeMap = await this.getFileSizes(uploads);
    const totalBytesToCopy = this.getTotalBytesToCopy(fileToSizeMap);
    const createUploadChildJobRequests: CreateJobRequest[] = [
      {
        ...this.defaultJobInfo,
        jobId: uploadChildJobIds[0],
        jobName: "Copy job parent",
        parentId,
        serviceFields: {
          totalBytesToCopy,
          type: COPY_TYPE,
        },
        updateParent: false,
      },
      {
        ...this.defaultJobInfo,
        jobId: uploadChildJobIds[1],
        jobName: "Tell FSS that copy is complete",
        parentId,
        serviceFields: {
          type: ADD_METADATA_TYPE,
        },
        updateParent: false,
      },
    ];

    try {
      const childJobs = await Promise.all(
        createUploadChildJobRequests.map((r) => this.jss.createJob(r))
      );
      return {
        ctx: {
          ...ctx,
          copyChildJobs: await this.createCopyJobs(
            uploads,
            uploadChildJobIds[0],
            fileToSizeMap
          ),
          totalBytesToCopy,
          uploadChildJobIds: uploadChildJobIds,
        },
        jobs: childJobs,
      };
    } catch (e) {
      const error = `Failed to create child upload job`;
      this.logger.error(error, e.response);
      throw new Error(error);
    }
  }

  private async createCopyJobs(
    uploads: Uploads,
    parentCopyJobId: string,
    fileToSizeMap: Map<string, number>
  ): Promise<JSSJob[]> {
    try {
      return await Promise.all(
        keys(uploads).map((originalPath: string) =>
          this.jss.createJob({
            ...this.defaultJobInfo,
            jobId: getUUID(),
            jobName: `Upload job for ${originalPath}`,
            parentId: parentCopyJobId,
            serviceFields: {
              ...this.defaultJobInfo.serviceFields,
              originalPath,
              totalBytes: fileToSizeMap.get(originalPath),
              type: COPY_CHILD_TYPE,
            },
            status: JSSJobStatus.WAITING,
            updateParent: true,
          })
        )
      );
    } catch (e) {
      const error = "Could not create copy child jobs!";
      this.logger.error(error, e.response);
      throw new Error("Could not create copy child jobs!");
    }
  }

  private getSteps(
    jobs: JSSJob[],
    getCopyWorker: () => Worker,
    copyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ): Step[] {
    if (jobs.length !== EXPECTED_NUMBER_UPLOAD_STEPS) {
      throw new Error(`Unexpected number of child jobs: ${jobs.length}`);
    }

    return [
      new CopyFilesStep(
        jobs[0],
        this.jss,
        getCopyWorker,
        this.logger,
        copyProgressCb,
        copyProgressCbThrottleMs
      ),
      new AddMetadataStep(jobs[1], this.fss, this.jss, this.logger),
    ];
  }

  private mapToResponse(files: FSSResponseFile[]): UploadResponse {
    return files.reduce(
      (accum: { [id: string]: FSSResponseFile }, curr: FSSResponseFile) => ({
        ...accum,
        [curr.fileName]: curr,
      }),
      {}
    );
  }
}
