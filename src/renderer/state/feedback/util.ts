import { HTTP_STATUS, ReduxLogicNextCb } from "../types";

import { setSuccessAlert, setWarningAlert } from "./actions";

// need a promise based timeout
export const timeout = (ms: number) =>
  new Promise((resolve: () => void) => {
    setTimeout(resolve, ms);
  });
const SERVICE_IS_DOWN_MESSAGE2 = `Could not contact server. Make sure services are running.`;
const SERVICE_MIGHT_BE_DOWN_MESSAGE2 =
  "Services might be down. Retrying request...";
const CANNOT_FIND_ADDRESS = "ENOTFOUND";
const RETRY_INTERVAL = 10000; // ms
const NUM_TRIES = 5;

/**
 * Wrapper for async requests that retries non-OK requests related to VPN issues and service deployments
 * Dispatches warning if it needs to retry and success if it retried and succeeded before reaching 5 tries
 * Waits 10 sec between tries
 * @param request function that returns a promise
 * @param dispatch Redux Logic dispatch call back (must be in process)
 */
export async function getWithRetry2<T = any>(
  request: () => Promise<T>,
  dispatch: ReduxLogicNextCb
): Promise<T> {
  let triesLeft = NUM_TRIES;
  let sentRetryAlert = false;
  let response: T | undefined;
  let error: string | undefined;
  let receivedNonRetryableError = false;

  while (triesLeft > 0 && !response && !receivedNonRetryableError) {
    try {
      triesLeft--;
      response = await request();
    } catch (e) {
      // Retry if we get a Bad Gateway. This is common when a server goes down during deployment.
      // Retrying requests where the host could not be resolved. This is common for VPN issues.
      if (
        e.response?.status === HTTP_STATUS.BAD_GATEWAY ||
        e.code === CANNOT_FIND_ADDRESS
      ) {
        if (!sentRetryAlert) {
          const message =
            e.response?.status === HTTP_STATUS.BAD_GATEWAY
              ? `Could not contact server. Make sure services are running.`
              : SERVICE_MIGHT_BE_DOWN_MESSAGE2;
          dispatch(setWarningAlert(message));
          sentRetryAlert = true;
        }
        await timeout(RETRY_INTERVAL);
      } else {
        receivedNonRetryableError = true;
        error = e.message;
      }
    }
  }

  if (response) {
    if (sentRetryAlert) {
      dispatch(setSuccessAlert("Success!"));
    }
    return response;
  } else {
    let message = "Unknown error";
    if (sentRetryAlert) {
      message = SERVICE_IS_DOWN_MESSAGE2;
    } else if (error) {
      message = error;
    }
    throw new Error(message);
  }
}
