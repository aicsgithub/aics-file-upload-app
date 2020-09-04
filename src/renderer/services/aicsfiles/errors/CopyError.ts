import { COPY_ERROR } from "../constants";

export class CopyError extends Error {
  public name = COPY_ERROR;
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, CopyError);
  }
}
