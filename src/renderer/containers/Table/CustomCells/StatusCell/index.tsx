import { Icon, Progress, Tooltip } from "antd";
import * as classNames from "classnames";
import * as React from "react";
import { CellProps } from "react-table";

import { JSSJobStatus } from "../../../../services/job-status-client/types";
import { UploadSummaryTableRow } from "../../../../state/types";
import { getPowerOf1000 } from "../../../../util";

const styles = require("./styles.pcss");

const POWER_OF_1000_TO_ABBREV = new Map<number, string>([
  [0, "B"],
  [1, "KB"],
  [2, "MB"],
  [3, "GB"],
  [4, "TB"],
]);

function getBytesDisplay(bytes: number): string {
  const powerOf1000 = getPowerOf1000(bytes);
  const unit = POWER_OF_1000_TO_ABBREV.get(powerOf1000);
  const number: number = bytes / Math.pow(1000, powerOf1000);
  let roundedNumber: string = number.toFixed(1);
  if (roundedNumber.endsWith("0")) {
    roundedNumber = number.toFixed(0);
  }
  return `${roundedNumber}${unit}`;
}

export default function StatusCell(props: CellProps<UploadSummaryTableRow>) {
  let tooltip = props.value;
  if (props.row.original.serviceFields?.error) {
    tooltip = `${props.value}: ${props.row.original.serviceFields.error}`;
  }

  let content: React.ReactNode;
  if (JSSJobStatus.SUCCEEDED === props.value) {
    content = (
      <Icon className={styles.success} type="check-circle" theme="filled" />
    );
  } else if (JSSJobStatus.FAILED === props.value) {
    content = (
      <Icon className={styles.failed} type="close-circle" theme="filled" />
    );
  } else if (JSSJobStatus.UNRECOVERABLE === props.value) {
    content = (
      <Icon
        className={styles.unrecoverable}
        type="close-circle"
        theme="filled"
      />
    );
  } else {
    let progress = 0;
    const appCopyInProgress = false;
    let totalBytesDisplay = "0";
    let completedBytesDisplay = "?";
    const stepInfo = !appCopyInProgress
      ? "Step 1 of 2: Uploading file"
      : "Step 2 of 2: Post-upload processing";
    tooltip = `${stepInfo}\n ${tooltip}`;
    if (props.row.original.progress?.totalBytes) {
      const { completedBytes, totalBytes } = props.row.original.progress;
      const fssCompletedBytes =
        props.row.original.serviceFields?.fssBytesProcessed ?? 0;
      const appCopyInProgress = completedBytes !== totalBytes;

      // `completedBytes` refers to the copy done by the app itself, while
      // `fssCompletedBytes` refers to the post-upload processing done by FSS.
      const completedBytesForStep = appCopyInProgress
        ? completedBytes
        : fssCompletedBytes;
      progress = Math.floor(totalBytes / completedBytesForStep);
      completedBytesDisplay = getBytesDisplay(completedBytesForStep);
      totalBytesDisplay = getBytesDisplay(totalBytes);
    }

    content = (
      <>
        <Progress
          className={classNames({ [styles.safeToClose]: !appCopyInProgress })}
          type="circle"
          percent={progress}
          width={25}
          status="active"
        />
        <div className={styles.activeInfo}>
          <p>Step {!appCopyInProgress ? 1 : 2} of 2</p>
          <p>
            {completedBytesDisplay} / {totalBytesDisplay}
          </p>
        </div>
      </>
    );
  }

  return (
    <Tooltip title={tooltip}>
      <div className={styles.container}>{content}</div>
    </Tooltip>
  );
}
