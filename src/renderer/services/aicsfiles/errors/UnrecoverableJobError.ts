import { UNRECOVERABLE_JOB_ERROR } from "../constants";

export class UnrecoverableJobError extends Error {
  public name = UNRECOVERABLE_JOB_ERROR;
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, UnrecoverableJobError);
  }
}
