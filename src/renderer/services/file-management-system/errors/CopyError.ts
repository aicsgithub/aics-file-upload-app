export default class CopyError extends Error {
  public name = "CopyError";
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, CopyError);
  }
}
