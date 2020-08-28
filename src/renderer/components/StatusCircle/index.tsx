import { Tooltip } from "antd";
import * as classNames from "classnames";
import * as React from "react";

import { JSSJobStatus } from "../../services/job-status-client/types";

const styles = require("./styles.pcss");

const IN_PROGRESS_CLASSNAME = "inProgress";
const SUCCESS_CLASSNAME = "success";
const ERROR_CLASSNAME = "error";
const UNRECOVERABLE_CLASSNAME = "unrecoverable";
const STATUS_TO_CLASSNAME_MAP: { [status: string]: string } = Object.freeze({
  BLOCKED: IN_PROGRESS_CLASSNAME,
  FAILED: ERROR_CLASSNAME,
  RETRYING: IN_PROGRESS_CLASSNAME,
  SUCCEEDED: SUCCESS_CLASSNAME,
  UNRECOVERABLE: UNRECOVERABLE_CLASSNAME,
  WAITING: IN_PROGRESS_CLASSNAME,
  WORKING: IN_PROGRESS_CLASSNAME,
});

interface Props {
  className?: string;
  status: JSSJobStatus;
}

const StatusCircle: React.FunctionComponent<Props> = ({
  className,
  status,
}: Props) => (
  <Tooltip placement="right" title={status} className={className}>
    <div
      className={classNames(
        styles.statusCircle,
        styles[STATUS_TO_CLASSNAME_MAP[status]]
      )}
    />
  </Tooltip>
);

export default StatusCircle;
