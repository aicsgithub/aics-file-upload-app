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

interface UploadProgressProps {
  isPolling: boolean;
  row: UploadSummaryTableRow;
}

const UploadProgress: React.FunctionComponent<UploadProgressProps> = ({
  isPolling,
  row,
}: UploadProgressProps) => {
  if (["SUCCEEDED", "UNRECOVERABLE", "FAILED"].includes(row.status)) {
    return null;
  }

  if (row?.serviceFields?.replacementJobId) {
    return <>Replaced</>;
  }

  const { progress } = row;
  if (!progress) {
    return <div className={styles.progressContainer}>No progress info</div>;
  }

  const { completedBytes, totalBytes } = progress;
  const powerOf1000 = getPowerOf1000(totalBytes);
  const unit = POWER_OF_1000_TO_ABBREV.get(powerOf1000);
  const completedBytesDisplay = (
    completedBytes / Math.pow(1000, powerOf1000)
  ).toFixed(1);
  const totalBytesDisplay = (totalBytes / Math.pow(1000, powerOf1000)).toFixed(
    1
  );

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
          {completedBytesDisplay}
          {unit} / {totalBytesDisplay}
          {unit}
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
