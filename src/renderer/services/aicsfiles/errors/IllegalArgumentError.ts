import { ILLEGAL_ARGUMENT_ERROR } from "../constants";

export class IllegalArgumentError extends Error {
  public name = ILLEGAL_ARGUMENT_ERROR;
  public constructor(...args: any[]) {
    super(...args);
    Error.captureStackTrace(this, IllegalArgumentError);
  }
}
