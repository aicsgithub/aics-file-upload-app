import { Icon, Progress, Tooltip } from "antd";
import * as React from "react";

import { UploadSummaryTableRow } from "../../../state/types";
import { getPowerOf1000 } from "../../../util";

const styles = require("./styles.pcss");

const POWER_OF_1000_TO_ABBREV = new Map<number, string>([
  [0, "B"],
  [1, "KB"],
  [2, "MB"],
  [3, "GB"],
  [4, "TB"],
]);

const getBytesDisplay = (bytes: number) => {
  const powerOf1000 = getPowerOf1000(bytes);
  const unit = POWER_OF_1000_TO_ABBREV.get(powerOf1000);
  const number: number = bytes / Math.pow(1000, powerOf1000);
  let roundedNumber: string = number.toFixed(1);
  if (roundedNumber.endsWith("0")) {
    roundedNumber = number.toFixed(0);
  }
  return `${roundedNumber}${unit}`;
};

interface UploadProgressProps {
  isPolling: boolean;
  row: UploadSummaryTableRow;
}

const UploadProgress: React.FunctionComponent<UploadProgressProps> = ({
  isPolling,
  row,
}: UploadProgressProps) => {
  if (row?.serviceFields?.replacementJobId) {
    // TODO This is not very helpful to the user. But until we stop
    // replacing jobs with other jobs, we'll need to show the user what happened
    return (
      <div className={styles.replaced}>
        Replaced with jobId {row?.serviceFields?.replacementJobId}
      </div>
    );
  }

  const { progress } = row;
  if (
    ["SUCCEEDED", "UNRECOVERABLE", "FAILED"].includes(row.status) ||
    !progress
  ) {
    return null;
  }

  const { completedBytes, totalBytes } = progress;
  const completedBytesDisplay = getBytesDisplay(completedBytes);
  const totalBytesDisplay = getBytesDisplay(totalBytes);

  return (
    <div className={styles.progressContainer}>
      <Progress
        className={styles.progress}
        showInfo={false}
        status="success"
        percent={Math.floor((100 * completedBytes) / totalBytes)}
      />
      <div className={styles.copyStatsContainer}>
        <div className={styles.bytes}>
          {completedBytesDisplay} / {totalBytesDisplay}
        </div>
        {completedBytes === totalBytes && <div>Finishing up</div>}
      </div>
      {!isPolling && (
        <Tooltip
          mouseLeaveDelay={0}
          title="Polling is not turned on - progress might not be accurate."
        >
          <Icon className={styles.warningIcon} type="warning" />
        </Tooltip>
      )}
    </div>
  );
};

export default UploadProgress;
