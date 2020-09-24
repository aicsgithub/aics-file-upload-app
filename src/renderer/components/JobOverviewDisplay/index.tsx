import { Alert, Descriptions } from "antd";
import * as React from "react";

import { JSSJob } from "../../services/job-status-client/types";

const Item = Descriptions.Item;

interface Props {
  className?: string;
  job: JSSJob;
}

const determineError = (error: string): string => {
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
  return (
    <>
      {job.serviceFields?.error && (
        <Alert
          type={job.serviceFields?.cancelled ? "warning" : "error"}
          message="Error"
          key="errorAlert"
          description={determineError(job.serviceFields.error)}
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
