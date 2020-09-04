import { FAILED_JOB_ERROR } from "../constants";

export class FailedJobError extends Error {
  public name = FAILED_JOB_ERROR;
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, FailedJobError);
  }
}
