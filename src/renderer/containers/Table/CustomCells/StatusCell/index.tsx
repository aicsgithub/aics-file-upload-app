import { Tooltip } from "antd";
import * as classNames from "classnames";
import * as React from "react";
import { CellProps } from "react-table";

import { UploadSummaryTableRow } from "../../../../state/types";

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

export default function StatusCell(props: CellProps<UploadSummaryTableRow>) {
  return (
    <Tooltip title={props.value} mouseLeaveDelay={0}>
      <div className={styles.container}>
        <div
          className={classNames(
            styles.statusCircle,
            styles[STATUS_TO_CLASSNAME_MAP[props.value]]
          )}
        />
      </div>
    </Tooltip>
  );
}
