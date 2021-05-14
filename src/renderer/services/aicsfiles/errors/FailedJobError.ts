export default class FailedJobError extends Error {
  public name = "FailedJob";
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, FailedJobError);
  }
}
