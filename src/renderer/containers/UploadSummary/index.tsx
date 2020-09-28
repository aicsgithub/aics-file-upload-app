import {
  Button,
  Col,
  Empty,
  Icon,
  Radio,
  Row,
  Spin,
  Switch,
  Table,
} from "antd";
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
import {
  gatherIncompleteJobIds,
  retrieveJobs,
  selectJobFilter,
  startJobPoll,
  stopJobPoll,
} from "../../state/job/actions";
import {
  getIncompleteJobIds,
  getIsPolling,
  getJobFilter,
  getJobsForTable,
} from "../../state/job/selectors";
import {
  GatherIncompleteJobIdsAction,
  RetrieveJobsAction,
  SelectJobFilterAction,
  StartJobPollAction,
  StopJobPollAction,
} from "../../state/job/types";
import {
  openEditFileMetadataTab,
  selectPage,
  selectView,
} from "../../state/route/actions";
import { getPage } from "../../state/route/selectors";
import {
  OpenEditFileMetadataTabAction,
  SelectPageAction,
  SelectViewAction,
} from "../../state/route/types";
import { getStagedFiles } from "../../state/selection/selectors";
import {
  AsyncRequest,
  JobFilter,
  Page,
  State,
  UploadFile,
  UploadProgressInfo,
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
  files: UploadFile[];
  gatherIncompleteJobIds: ActionCreator<GatherIncompleteJobIdsAction>;
  incompleteJobIds: string[];
  isPolling: boolean;
  jobFilter: JobFilter;
  jobs: UploadSummaryTableRow[];
  openEditFileMetadataTab: ActionCreator<OpenEditFileMetadataTabAction>;
  page: Page;
  requestsInProgress: Array<string | AsyncRequest>;
  requestingJobs: boolean;
  retrieveJobs: ActionCreator<RetrieveJobsAction>;
  retryUpload: ActionCreator<RetryUploadAction>;
  selectPage: ActionCreator<SelectPageAction>;
  selectView: ActionCreator<SelectViewAction>;
  selectJobFilter: ActionCreator<SelectJobFilterAction>;
  startJobPoll: ActionCreator<StartJobPollAction>;
  stopJobPoll: ActionCreator<StopJobPollAction>;
}

class UploadSummary extends React.Component<Props, {}> {
  private get columns(): ColumnProps<UploadSummaryTableRow>[] {
    const columns: ColumnProps<UploadSummaryTableRow>[] = [
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
                    `${AsyncRequest.RETRY_UPLOAD}-${row.jobName}`
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

    if ([JobFilter.All, JobFilter.InProgress].includes(this.props.jobFilter)) {
      columns.splice(2, 0, {
        dataIndex: "progress",
        key: "progress",
        render: (progress: UploadProgressInfo, row: UploadSummaryTableRow) => (
          <UploadProgress isPolling={this.props.isPolling} row={row} />
        ),
        title: "Progress",
        width: "350px",
      });
    }
    return columns;
  }

  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  public componentDidMount(): void {
    // this retrieves jobs to display on table (no polling; one-time call.)
    this.props.retrieveJobs();
    // this gathers jobs that are stored in "local storage" for all uploads that have been initiated and/or retried.
    // this is solely for reporting purposes in case an upload succeeded or failed while the app was not running
    this.props.gatherIncompleteJobIds();
  }

  public componentWillUnmount(): void {
    this.props.stopJobPoll();
  }

  public render() {
    const {
      className,
      isPolling,
      jobFilter,
      jobs,
      page,
      requestingJobs,
    } = this.props;
    const buttonLabel =
      page !== Page.UploadSummary ? (
        <>Resume Upload</>
      ) : (
        <>
          <Icon type="plus" />
          &nbsp;New Upload
        </>
      );
    return (
      <div className={classNames(styles.container, className)}>
        <div className={styles.section}>
          <div className={styles.header}>
            <Row
              type="flex"
              justify="space-between"
              align="middle"
              className={styles.title}
            >
              <Col>
                <h2>Your Uploads</h2>
              </Col>
              <Col>
                <Button
                  type="primary"
                  size="large"
                  onClick={this.startNewUpload}
                >
                  {buttonLabel}
                </Button>
              </Col>
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
              <Col>
                Polling for Uploads is&nbsp;
                <Switch
                  checkedChildren="ON"
                  unCheckedChildren="OFF"
                  checked={isPolling}
                  onClick={this.togglePoll}
                />
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
    this.props.retrieveJobs();
  };

  private togglePoll = () =>
    this.props.isPolling ? this.props.stopJobPoll() : this.props.startJobPoll();

  private startNewUpload = (): void => {
    // If the current page is UploadSummary we must just be a view
    if (this.props.page !== Page.UploadSummary) {
      this.props.selectView(this.props.page);
    } else if (this.props.files.length > 0) {
      // If we already have files staged skip the drag and drop page
      this.props.selectPage(Page.UploadSummary, Page.SelectUploadType);
    } else {
      this.props.selectPage(Page.UploadSummary, Page.DragAndDrop);
    }
  };

  private retryJob = (row: UploadSummaryTableRow) => () => {
    if (
      !this.props.requestsInProgress.includes(
        `${AsyncRequest.RETRY_UPLOAD}-${row.jobName}`
      )
    ) {
      this.props.retryUpload(row, this.props.incompleteJobIds);
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
    files: getStagedFiles(state),
    incompleteJobIds: getIncompleteJobIds(state),
    isPolling: getIsPolling(state),
    jobFilter: getJobFilter(state),
    jobs: getJobsForTable(state),
    page: getPage(state),
    requestsInProgress: getRequestsInProgress(state),
    requestingJobs: getRequestsInProgressContains(state, AsyncRequest.GET_JOBS),
  };
}

const dispatchToPropsMap = {
  cancelUpload,
  gatherIncompleteJobIds,
  openEditFileMetadataTab,
  retrieveJobs,
  retryUpload,
  selectJobFilter,
  selectPage,
  selectView,
  startJobPoll,
  stopJobPoll,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
