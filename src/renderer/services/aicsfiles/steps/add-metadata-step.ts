import * as Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import { isEmpty } from "lodash";

import JobStatusClient from "../../job-status-client";
import { AICSFILES_LOGGER } from "../constants";
import { IllegalArgumentError } from "../errors";
import { FSSClient } from "../helpers/fss-client";
import { Job, Step, StepName, UploadContext } from "../types";

// Step 2/2 of an upload in which we notify FSS that the upload is complete for a job and send metadata
// to be stored in the database for each file
export class AddMetadataStep implements Step {
  public readonly job: Job;
  public readonly name: StepName = StepName.AddMetadata;
  private readonly fss: FSSClient;
  private readonly jss: JobStatusClient;
  private readonly logger: ILogger;

  public constructor(
    job: Job,
    fss: FSSClient,
    jss: JobStatusClient,
    logger: ILogger = Logger.get(AICSFILES_LOGGER)
  ) {
    this.job = job;
    this.fss = fss;
    this.jss = jss;
    this.logger = logger;
  }

  public start = async (ctx: UploadContext): Promise<UploadContext> => {
    if (isEmpty(ctx.sourceFiles) || !ctx.sourceFiles) {
      throw new IllegalArgumentError("Context is missing source files!");
    }

    try {
      const { files: resultFiles } = await this.fss.uploadComplete(
        ctx.startUploadResponse.jobId,
        ctx.sourceFiles
      );
      return {
        ...ctx,
        resultFiles,
      };
    } catch (e) {
      const { response } = e;
      const { data, status, config } = response;
      const error = `Received ${status} response from ${config.url}.
            
            request was: ${config.data}
            
            response was:${data.error || data.message}`;
      this.logger.error(error, e.response);
      throw new Error(error);
    }
  };

  // This an `async` method because it overrides Step.skip
  // eslint-disable-next-line @typescript-eslint/require-await
  public skip = async (ctx: UploadContext): Promise<UploadContext> => {
    if (!this.job.serviceFields || !this.job.serviceFields.output) {
      throw new IllegalArgumentError(
        "job.serviceFields.output was not defined"
      );
    }

    return {
      ...ctx,
      resultFiles: this.job.serviceFields.output,
    };
  };

  public end = async (ctx: UploadContext): Promise<void> => {
    if (!ctx.resultFiles) {
      throw new IllegalArgumentError("Context is missing resultFiles");
    }

    try {
      await this.jss.updateJob(this.job.jobId, {
        status: "SUCCEEDED",
        serviceFields: {
          output: ctx.resultFiles,
        },
      });
    } catch (e) {
      const error = `Could not update the add metadata job ${this.job.jobId} after ending add metadata step`;
      this.logger.error(error, e.response);
      throw new Error(error);
    }
  };
}
