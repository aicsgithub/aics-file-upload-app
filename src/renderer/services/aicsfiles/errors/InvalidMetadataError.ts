import { INVALID_METADATA_ERROR } from "../constants";

export class InvalidMetadataError extends Error {
  public name = INVALID_METADATA_ERROR;
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, InvalidMetadataError);
  }
}
