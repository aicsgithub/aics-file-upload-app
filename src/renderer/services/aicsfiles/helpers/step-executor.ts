import * as Logger from "js-logger";
import { includes } from "lodash";

import JobStatusClient from "../../job-status-client";
import { JSSJobStatus } from "../../job-status-client/types";
import { AICSFILES_LOGGER } from "../constants";
import { Step, UploadContext } from "../types";

const VALID_STEP_STATUSES = ["SUCCEEDED", "WAITING", "FAILED"];

// Executes steps in series or in parallel. Utilizes a upload context that stores the state of that upload.
// The context gets updated by step.start() and step.skip(). step.end() is always ran asychronously and is used
// to synchronize the JSS Job(s) that the step is associated with.
export class StepExecutor {
  /**
   * Executes steps in series
   * @param jss job status client for interacting with JSS
   * @param steps a list of steps to execute
   * @param ctx upload context representing state of upload
   */
  public static async executeSteps(
    jss: JobStatusClient,
    steps: Step[],
    ctx: UploadContext
  ): Promise<UploadContext> {
    StepExecutor.validateSteps(steps);

    // Executes each step in the order they are given, using the output of the
    // last step as input to the next step. The output of the last step is returned.
    return steps.reduce(
      async (ctxPromise: Promise<UploadContext>, step: Step) =>
        StepExecutor.executeStep(step, await ctxPromise, jss),
      Promise.resolve(ctx)
    );
  }

  /**
   * Executes steps in parallel.
   * @param jss job status client for interacting with JSS
   * @param steps a list of steps to execute
   * @param ctx upload context representing state of upload
   */
  public static async executeStepsInParallel(
    jss: JobStatusClient,
    steps: Step[],
    ctx: UploadContext
  ): Promise<UploadContext[]> {
    StepExecutor.validateSteps(steps);

    return Promise.all(steps.map((s) => StepExecutor.executeStep(s, ctx, jss)));
  }

  private static validateSteps(steps: Step[]): void {
    const errorMessages = steps
      .filter((s) => !includes(VALID_STEP_STATUSES, s.job.status))
      .map(
        (s, i) =>
          `Cannot execute Step ${i + 1}: ${s.name} because its job status is ${
            s.job.status
          }.`
      );
    if (errorMessages.length > 0) {
      throw new Error(errorMessages.join(" "));
    }
  }

  private static async executeStep(
    step: Step,
    ctx: UploadContext,
    jss: JobStatusClient
  ): Promise<UploadContext> {
    if (step.job.status === "SUCCEEDED") {
      Logger.get(AICSFILES_LOGGER).info(
        `Skipping step: "${step.name}" as it is complete`
      );
      return step.skip(ctx);
    }

    try {
      const newStatus: JSSJobStatus =
        step.job.status === "WAITING" ? "WORKING" : "RETRYING";
      if (ctx.uploadJob) {
        await jss.updateJob(ctx.uploadJob.jobId, {
          currentStage: step.name,
        });
      }

      await jss
        .updateJob(step.job.jobId, {
          status: newStatus,
        })
        .catch((e) => {
          const error = `Could not update status for job ${step.job.jobId} from ${step.job.status} to ${newStatus}`;
          Logger.get(AICSFILES_LOGGER).error(error, e.response);
          throw new Error(error);
        });

      Logger.get(AICSFILES_LOGGER).info(
        `Starting step "${step.name}" for jobId=${step.job.jobId} with ctx:`,
        ctx
      );
      ctx = await step.start(ctx);

      Logger.get(AICSFILES_LOGGER).info(
        `Ending step "${step.name}" for jobId=${step.job.jobId} with ctx:`,
        ctx
      );
      await step.end(ctx);
      return ctx;
    } catch (e) {
      await jss
        .updateJob(
          step.job.jobId,
          {
            status: "FAILED",
            serviceFields: {
              error: e.message,
            },
          },
          true
        )
        .catch((e) => {
          const error = `Could not update status for job ${step.job.jobId} from ${step.job.status} to FAILED`;
          Logger.get(AICSFILES_LOGGER).error(error, e.response);
          throw new Error(error);
        });
      throw e;
    }
  }
}
