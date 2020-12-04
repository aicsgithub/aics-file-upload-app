import { Progress } from "antd";
import * as React from "react";

import { JSSJobStatus } from "../../../services/job-status-client/types";
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
  row: UploadSummaryTableRow;
}

const UploadProgress: React.FunctionComponent<UploadProgressProps> = ({
  row: { progress, status, serviceFields },
}: UploadProgressProps) => {
  if (serviceFields?.replacementJobId) {
    // TODO This is not very helpful to the user. But until we stop
    // replacing jobs with other jobs, we'll need to show the user what happened
    return (
      <div className={styles.replaced}>
        Replaced with jobId {serviceFields.replacementJobId}
      </div>
    );
  }

  if (
    [
      JSSJobStatus.SUCCEEDED,
      JSSJobStatus.UNRECOVERABLE,
      JSSJobStatus.FAILED,
    ].includes(status) ||
    !progress
  ) {
    return null;
  }

  const { completedBytes, totalBytes } = progress;
  const fssCompletedBytes = serviceFields?.fssBytesProcessed ?? 0;
  const appCopyInProgress = completedBytes !== totalBytes;

  const completedBytesForStep = appCopyInProgress
    ? completedBytes
    : fssCompletedBytes;
  const completedBytesDisplay = getBytesDisplay(completedBytesForStep);
  const totalBytesDisplay = getBytesDisplay(totalBytes);

  return (
    <>
      <div className={styles.progressContainer}>
        <Progress
          className={styles.progress}
          showInfo={false}
          status="success"
          percent={Math.floor((100 * completedBytesForStep) / totalBytes)}
          key={appCopyInProgress.toString()}
        />
        <div className={styles.copyStatsContainer}>
          <div className={styles.bytes}>
            {completedBytesDisplay} / {totalBytesDisplay}
          </div>
        </div>
      </div>
      <div className={styles.step}>
        {appCopyInProgress
          ? "Step 1 of 2: Uploading file"
          : "Step 2 of 2: Processing upload in FMS"}
      </div>
    </>
  );
};

export default UploadProgress;
