import { Tooltip } from "antd";
import React from "react";
import { useSelector } from "react-redux";
import { CellProps } from "react-table";

import StatusCircle from "../../../../components/StatusCircle";
import { JSSJobStatus } from "../../../../services/job-status-client/types";
import { getSelectedJob } from "../../../../state/selection/selectors";
import { UploadJobTableRow } from "../../../../state/upload/types";

const styles = require("./styles.pcss");

/**
 * This cell displays the upload status of an individual file to the user
 */
export default function StatusCell({
  row,
}: CellProps<UploadJobTableRow, string>) {
  const selectedJob = useSelector(getSelectedJob);
  const job = selectedJob?.uploadGroup?.filter(
    (upload) =>
      upload.serviceFields?.files?.[0].file.originalPath === row.original.file
  )[0];
  return (
    <div className={styles.container}>
      <Tooltip overlay={status}>
        <StatusCircle status={job?.status as JSSJobStatus} />
      </Tooltip>
    </div>
  );
}
