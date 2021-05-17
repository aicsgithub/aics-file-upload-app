export default class IllegalArgumentError extends Error {
  public name = "IllegalArgument";
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, IllegalArgumentError);
  }
}
