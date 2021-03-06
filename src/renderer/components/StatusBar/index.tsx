import { Button } from "antd";
import * as classNames from "classnames";
import * as logger from "js-logger";
import * as React from "react";

import { AppEvent } from "../../state/types";

const styles = require("./style.pcss");
export const SECONDS_IN_A_MINUTE = 60;
export const SECONDS_IN_AN_HOUR = 60 * SECONDS_IN_A_MINUTE;
export const SECONDS_IN_A_DAY = SECONDS_IN_AN_HOUR * 24;
export const MILLISECONDS_PER_SECOND = 1000;

const getStatusMessage = (event?: AppEvent) => {
  if (!event) {
    return "";
  }

  let time = "";
  const now = new Date();
  const secondsElapsed =
    (now.getTime() - event.date.getTime()) / MILLISECONDS_PER_SECOND;

  if (secondsElapsed < SECONDS_IN_A_MINUTE) {
    time = "(moments ago)";
  } else if (secondsElapsed < SECONDS_IN_AN_HOUR) {
    const minutes = Math.round(secondsElapsed / SECONDS_IN_A_MINUTE);
    time = `(${minutes} minutes ago)`;
  } else if (secondsElapsed < SECONDS_IN_A_DAY) {
    const hour = event.date.getHours() % 12;
    const minutes = event.date.getMinutes();
    const ampm = event.date.getHours() > 12 ? "PM" : "AM";
    time = `(today ${hour}:${minutes} ${ampm}`;
  } else {
    // clear out message because the event happened over a day ago
    return "";
  }

  return `${event.message} ${time}`;
};

const copyStatusToClipboard = (message: string) => async () => {
  const { state }: PermissionStatus = await navigator.permissions
    // casting since type definitions are not accurate
    .query({ name: "clipboard-write" as PermissionName });
  if (state === "granted" || state === "prompt") {
    try {
      await navigator.clipboard.writeText(message);
    } catch (e) {
      logger.error(`Could not copy text to your clipboard: ${e.message}`);
    }
  } else {
    logger.error("Did not have correct permissions to copy to clipboard");
  }
};

export interface StatusBarProps {
  className?: string;
  event?: AppEvent;
  limsUrl: string;
}

const StatusBar: React.FunctionComponent<StatusBarProps> = (props) => {
  const { className, event, limsUrl } = props;
  const statusMessage = getStatusMessage(event);

  return (
    <div className={classNames(styles.container, className)}>
      <div className={styles.statusContainer}>
        <div className={styles.status} title={statusMessage}>
          {statusMessage}
        </div>
        {statusMessage !== "" && (
          <Button
            className={styles.copy}
            onClick={copyStatusToClipboard(statusMessage)}
            size="small"
            type="link"
          >
            Copy
          </Button>
        )}
      </div>
      <div className={styles.host}>LIMS Host: {limsUrl}</div>
    </div>
  );
};

export default StatusBar;
