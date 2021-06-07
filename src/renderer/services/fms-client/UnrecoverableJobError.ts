export const UNRECOVERABLE_JOB_ERROR = "UnrecoverableJobError";

// Error describing inability to recover from job failure
export class UnrecoverableJobError extends Error {
  public name = UNRECOVERABLE_JOB_ERROR;
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, UnrecoverableJobError);
  }
}
