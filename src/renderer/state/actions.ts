import { REQUEST_FAILED } from "./constants";
import { AsyncRequest, RequestFailedAction } from "./types";

export function requestFailed(
  error: string,
  requestType: AsyncRequest | string
): RequestFailedAction {
  return {
    payload: {
      error,
      requestType,
    },
    type: REQUEST_FAILED,
  };
}
