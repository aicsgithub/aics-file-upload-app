import { Collapse } from "antd";
import classNames from "classnames";
import * as React from "react";

import {
  FAILED_STATUSES,
  JSSJob,
} from "../../services/job-status-client/types";
import { UploadServiceFields } from "../../services/types";
import LabeledInput from "../LabeledInput";

const styles = require("./styles.pcss");

const { Panel } = Collapse;

interface Props {
  uploads: JSSJob[];
}

const TIME_DISPLAY_CONFIG: Intl.DateTimeFormatOptions = Object.freeze({
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  weekday: "short",
  year: "numeric",
});

function determineError(job: JSSJob<UploadServiceFields>): string {
  const error = job?.serviceFields?.error || "Upload Failed";
  if (error.toLowerCase().includes("chmod")) {
    return `Error while uploading, you and/or FMS did not have permission to read one of these files.
                The full error was: ${error}`;
  }
  return error;
}

export default function JobOverviewDisplay({ uploads }: Props) {
  if (!uploads.length) {
    return null;
  }

  const panels = uploads.map((upload) => {
    const hasError =
      !!upload.serviceFields?.error || FAILED_STATUSES.includes(upload.status);
    const wasCancelled = !!upload.serviceFields?.cancelled;
    return (
      <Panel
        className={classNames({
          [styles.error]: hasError,
          [styles.warning]: wasCancelled,
        })}
        header={upload.jobName}
        key={upload.jobId}
      >
        <div className={styles.descriptionContainer}>
          <LabeledInput label="Job ID">{upload.jobId}</LabeledInput>
          <LabeledInput label="Uploaded">
            {upload.created.toLocaleTimeString([], TIME_DISPLAY_CONFIG)}
          </LabeledInput>
        </div>
        {hasError && (
          <LabeledInput label="Error">{determineError(upload)}</LabeledInput>
        )}
        <hr />
      </Panel>
    );
  });

  return <Collapse>{panels}</Collapse>;
}
