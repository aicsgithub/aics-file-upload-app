export default class InvalidMetadataError extends Error {
  public name = "InvalidMetadata";
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, InvalidMetadataError);
  }
}
