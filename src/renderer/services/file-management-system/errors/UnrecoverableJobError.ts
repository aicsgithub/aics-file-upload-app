export default class UnrecoverableJobError extends Error {
  public name = "UnrecoverableJob";
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, UnrecoverableJobError);
  }
}
