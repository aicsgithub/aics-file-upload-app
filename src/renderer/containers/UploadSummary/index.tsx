import { Col, Empty, Radio, Row, Spin, Table } from "antd";
import { RadioChangeEvent } from "antd/es/radio";
import { ColumnProps } from "antd/lib/table";
import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import StatusCircle from "../../components/StatusCircle";
import {
  IN_PROGRESS_STATUSES,
  JSSJobStatus,
} from "../../services/job-status-client/types";
import {
  getRequestsInProgress,
  getRequestsInProgressContains,
} from "../../state/feedback/selectors";
import { selectJobFilter } from "../../state/job/actions";
import { getJobFilter, getJobsForTable } from "../../state/job/selectors";
import { SelectJobFilterAction } from "../../state/job/types";
import { openEditFileMetadataTab } from "../../state/route/actions";
import { OpenEditFileMetadataTabAction } from "../../state/route/types";
import {
  AsyncRequest,
  JobFilter,
  State,
  UploadSummaryTableRow,
} from "../../state/types";
import { cancelUpload, retryUpload } from "../../state/upload/actions";
import {
  CancelUploadAction,
  RetryUploadAction,
} from "../../state/upload/types";

import UploadProgress from "./UploadProgress";

const styles = require("./styles.pcss");

const jobStatusOptions: JobFilter[] = map(JobFilter, (value) => value);

const TIME_DISPLAY_CONFIG = Object.freeze({
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  weekday: "short",
  year: "numeric",
});

interface Props {
  cancelUpload: ActionCreator<CancelUploadAction>;
  className?: string;
  jobFilter: JobFilter;
  jobs: UploadSummaryTableRow[];
  openEditFileMetadataTab: ActionCreator<OpenEditFileMetadataTabAction>;
  requestsInProgress: Array<string | AsyncRequest>;
  requestingJobs: boolean;
  retryUpload: ActionCreator<RetryUploadAction>;
  selectJobFilter: ActionCreator<SelectJobFilterAction>;
}

class UploadSummary extends React.Component<Props, {}> {
  private get columns(): ColumnProps<UploadSummaryTableRow>[] {
    return [
      {
        align: "center",
        dataIndex: "status",
        key: "status",
        render: (status: JSSJobStatus) => <StatusCircle status={status} />,
        title: "Status",
        width: "90px",
      },
      {
        dataIndex: "jobName",
        ellipsis: true,
        key: "fileName",
        title: "File Names",
        width: "100%",
        render: (filename: string, row: UploadSummaryTableRow) => (
          <>
            {filename}
            <UploadProgress row={row} />
          </>
        ),
      },
      {
        dataIndex: "modified",
        key: "modified",
        render: (modified: Date) =>
          modified.toLocaleTimeString([], TIME_DISPLAY_CONFIG),
        title: "Last Modified",
        width: "300px",
      },
      {
        key: "action",
        render: (_: any, row: UploadSummaryTableRow) => (
          <>
            <a className={styles.action} onClick={this.viewJob(row)}>
              View
            </a>
            {row.status === JSSJobStatus.FAILED && (
              <a
                className={classNames(styles.action, {
                  [styles.disabled]: this.props.requestsInProgress.includes(
                    `${AsyncRequest.UPLOAD}-${row.jobName}`
                  ),
                })}
                onClick={this.retryJob(row)}
              >
                Retry
              </a>
            )}
            {IN_PROGRESS_STATUSES.includes(row.status) && (
              <a
                className={classNames(styles.action, {
                  [styles.disabled]: this.props.requestsInProgress.includes(
                    `${AsyncRequest.CANCEL_UPLOAD}-${row.jobName}`
                  ),
                })}
                onClick={this.cancelJob(row)}
              >
                Cancel
              </a>
            )}
          </>
        ),
        title: "Action",
        width: "200px",
      },
    ];
  }

  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  public render() {
    const { className, jobFilter, jobs, requestingJobs } = this.props;
    return (
      <div className={classNames(styles.container, className)}>
        <div className={styles.section}>
          <div className={styles.header}>
            <Row>
              <h2>Your Uploads</h2>
            </Row>
            <Row type="flex" justify="space-between" align="middle">
              <Col>
                <Radio.Group
                  onChange={this.selectJobFilter}
                  value={jobFilter}
                  className={styles.filters}
                >
                  {jobStatusOptions.map((option) => (
                    <Radio.Button key={option} value={option}>
                      {option}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Col>
            </Row>
          </div>
          {jobs.length ? (
            <Table
              className={classNames(styles.content, styles.jobTable)}
              columns={this.columns}
              dataSource={jobs}
            />
          ) : (
            <div className={classNames(styles.content, styles.empty)}>
              {requestingJobs ? (
                <Spin size="large" />
              ) : (
                <Empty
                  description={`No ${
                    jobFilter === JobFilter.All ? "" : `${jobFilter} `
                  } Uploads`}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  private selectJobFilter = (e: RadioChangeEvent): void => {
    this.props.selectJobFilter(e.target.value);
  };

  private retryJob = (row: UploadSummaryTableRow) => () => {
    if (
      !this.props.requestsInProgress.includes(
        `${AsyncRequest.UPLOAD}-${row.jobName}`
      )
    ) {
      this.props.retryUpload(row);
    }
  };

  private cancelJob = (row: UploadSummaryTableRow) => () => {
    if (
      !this.props.requestsInProgress.includes(
        `${AsyncRequest.CANCEL_UPLOAD}-${row.jobName}`
      )
    ) {
      this.props.cancelUpload(row);
    }
  };

  private viewJob = (row: UploadSummaryTableRow) => () => {
    this.props.openEditFileMetadataTab(row);
  };
}

function mapStateToProps(state: State) {
  return {
    jobFilter: getJobFilter(state),
    jobs: getJobsForTable(state),
    requestsInProgress: getRequestsInProgress(state),
    requestingJobs: getRequestsInProgressContains(state, AsyncRequest.GET_JOBS),
  };
}

const dispatchToPropsMap = {
  cancelUpload,
  openEditFileMetadataTab,
  retryUpload,
  selectJobFilter,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
