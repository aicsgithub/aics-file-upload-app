// need a promise based timeout
import { HTTP_STATUS, ReduxLogicNextCb } from "../types";

import { setSuccessAlert, setWarningAlert } from "./actions";

const timeout = (ms: number) =>
  new Promise((resolve: () => void) => setTimeout(resolve, ms));
export const SERVICE_IS_DOWN_MESSAGE2 = `Could not contact server. Make sure services are running.`;
export const SERVICE_MIGHT_BE_DOWN_MESSAGE2 =
  "Services might be down. Retrying request...";
const CANNOT_FIND_ADDRESS = "ENOTFOUND";
const RETRY_INTERVAL = 10000; // ms
const NUM_TRIES = 5;
export async function getWithRetry2<T = any>(
  request: () => Promise<T>,
  dispatch: ReduxLogicNextCb
): Promise<T> {
  let triesLeft = NUM_TRIES;
  let sentRetryAlert = false;
  let response: T | undefined;
  let error: string | undefined;

  while (triesLeft > 0 && !response) {
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
