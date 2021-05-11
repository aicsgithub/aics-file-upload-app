import { Alert } from "antd";
import classNames from "classnames";
import * as React from "react";

import {
  FAILED_STATUSES,
  JSSJob,
} from "../../services/job-status-client/types";
import LabeledInput from "../LabeledInput";

const styles = require("./styles.pcss");

interface Props {
  className?: string;
  job: JSSJob;
}

export const TIME_DISPLAY_CONFIG = Object.freeze({
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  weekday: "short",
  year: "numeric",
});

const determineError = (job: JSSJob): string => {
  const error = job?.serviceFields?.error || "Upload Failed";
  if (error.toLowerCase().includes("chmod")) {
    return `Error while uploading, you and/or FMS did not have permission to read one of these files.
                The full error was: ${error}`;
  }
  return error;
};

export default function JobOverviewDisplay({ className, job }: Props) {
  const { created, jobId } = job;
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
      <div className={classNames(styles.descriptionContainer, className)}>
        <LabeledInput label="Job ID">{jobId}</LabeledInput>
        <LabeledInput label="Uploaded">
          {created.toLocaleTimeString([], TIME_DISPLAY_CONFIG)}
        </LabeledInput>
      </div>
      <hr />
    </>
  );
}
