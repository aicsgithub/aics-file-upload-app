import { Alert, Descriptions } from "antd";
import * as React from "react";

import {
  FAILED_STATUSES,
  JSSJob,
} from "../../services/job-status-client/types";

const Item = Descriptions.Item;

interface Props {
  className?: string;
  job: JSSJob;
}

const determineError = (job: JSSJob): string => {
  const error = job?.serviceFields?.error || "Upload Failed";
  if (error.toLowerCase().includes("chmod")) {
    return `Error while uploading, you and/or FMS did not have permission to read one of these files.
                The full error was: ${error}`;
  }
  return error;
};

const JobOverviewDisplay: React.FunctionComponent<Props> = ({
  className,
  job,
}: Props) => {
  const { created, jobId, user } = job;
  console.log(job);
  console.log(job.serviceFields?.relatedJobs);
  return (
    <>
      {(job.serviceFields?.error || FAILED_STATUSES.includes(job.status)) && (
        <Alert
          type={job.serviceFields?.cancelled ? "warning" : "error"}
          message={job.serviceFields?.cancelled ? "Warning" : "Error"}
          key="errorAlert"
          description={determineError(job)}
          showIcon={true}
          style={{ marginBottom: "0.5em" }}
        />
      )}
      {job.serviceFields?.replacementJobId && (
        <Alert
          message="Warning"
          type="warning"
          description={`This upload was replaced by job id ${job.serviceFields.replacementJobId}`}
          showIcon={true}
          style={{ marginBottom: "0.5em" }}
        />
      )}
      <Descriptions
        className={className}
        size="small"
        column={{ xs: 1 }}
        layout="vertical"
      >
        <Item label="Job Id">{jobId}</Item>
        <Item label="Created">{created.toLocaleString()}</Item>
        <Item label="Created By">{user}</Item>
      </Descriptions>
    </>
  );
};

export default JobOverviewDisplay;
