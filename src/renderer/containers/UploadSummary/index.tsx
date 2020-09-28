import { Button, Col, Empty, Icon, Modal, Radio, Row, Spin, Table } from "antd";
import { RadioChangeEvent } from "antd/es/radio";
import { ColumnProps } from "antd/lib/table";
import * as classNames from "classnames";
import { isEmpty, map } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FileMetadataModal from "../../components/FileMetadataModal";
import StatusCircle from "../../components/StatusCircle";
import UploadJobDisplay from "../../components/UploadJobDisplay";
import { FSSResponseFile } from "../../services/aicsfiles/types";
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
import {
  clearFileMetadataForJob,
  requestFileMetadataForJob,
} from "../../state/metadata/actions";
import {
  getFileMetadataForJob,
  getFileMetadataForJobHeader,
} from "../../state/metadata/selectors";
import {
  ClearFileMetadataForJobAction,
  RequestFileMetadataForJobAction,
  SearchResultsHeader,
} from "../../state/metadata/types";
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
  SearchResultRow,
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
  clearFileMetadataForJob: ActionCreator<ClearFileMetadataForJobAction>;
  fileMetadataForJob?: SearchResultRow[];
  fileMetadataForJobHeader?: SearchResultsHeader[];
  fileMetadataForJobLoading: boolean;
  files: UploadFile[];
  jobFilter: JobFilter;
  jobs: UploadSummaryTableRow[];
  openEditFileMetadataTab: ActionCreator<OpenEditFileMetadataTabAction>;
  page: Page;
  requestFileMetadataForJob: ActionCreator<RequestFileMetadataForJobAction>;
  requestsInProgress: Array<string | AsyncRequest>;
  requestingJobs: boolean;
  retryUpload: ActionCreator<RetryUploadAction>;
  selectPage: ActionCreator<SelectPageAction>;
  selectView: ActionCreator<SelectViewAction>;
  selectJobFilter: ActionCreator<SelectJobFilterAction>;
}

interface UploadSummaryState {
  selectedJobId?: string;
  selectedRowInJob?: SearchResultRow;
}

class UploadSummary extends React.Component<Props, UploadSummaryState> {
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
            {row.status === JSSJobStatus.SUCCEEDED && (
              <a className={styles.action} onClick={this.editJob(row)}>
                Edit
              </a>
            )}
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
          <UploadProgress row={row} />
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

  public render() {
    const {
      className,
      fileMetadataForJob,
      fileMetadataForJobHeader,
      fileMetadataForJobLoading,
      jobFilter,
      jobs,
      page,
      requestingJobs,
    } = this.props;
    const { selectedRowInJob } = this.state;
    const selectedJob = this.getSelectedJob();
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
          {selectedJob && (
            <Modal
              title="Upload Job"
              width="90%"
              visible={!!selectedJob}
              footer={null}
              onCancel={this.closeModal}
            >
              <UploadJobDisplay
                job={selectedJob}
                fileMetadataForJob={fileMetadataForJob}
                fileMetadataForJobHeader={fileMetadataForJobHeader}
                fileMetadataForJobLoading={fileMetadataForJobLoading}
                onFileRowClick={this.openFileDetailModal}
              />
              <FileMetadataModal
                fileMetadata={selectedRowInJob}
                closeFileDetailModal={this.closeFileDetailModal}
              />
            </Modal>
          )}
        </div>
      </div>
    );
  }

  private openFileDetailModal = (selectedRowInJob: SearchResultRow): void => {
    this.setState({ selectedRowInJob });
  };

  private closeFileDetailModal = (): void => {
    this.setState({ selectedRowInJob: undefined });
  };

  private selectJobFilter = (e: RadioChangeEvent): void => {
    this.props.selectJobFilter(e.target.value);
  };

  private getSelectedJob = (): UploadSummaryTableRow | undefined => {
    const { jobs } = this.props;
    const { selectedJobId } = this.state;
    return jobs.find((j) => j.jobId === selectedJobId);
  };

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

  private requestFileMetadataForJob = (jobId: string): void => {
    const { jobs } = this.props;
    const job = jobs.find((j) => j.jobId === jobId);
    if (
      job &&
      job.serviceFields &&
      job.serviceFields.files &&
      Array.isArray(job.serviceFields.result) &&
      !isEmpty(job.serviceFields.result)
    ) {
      const fileIds = job.serviceFields.result.map(
        (fileInfo: FSSResponseFile) => {
          return fileInfo.fileId;
        }
      );
      this.props.requestFileMetadataForJob(fileIds);
    }
  };

  private viewJob = (row: UploadSummaryTableRow) => () => {
    this.requestFileMetadataForJob(row.jobId);
    this.setState({ selectedJobId: row.jobId });
  };

  private retryJob = (row: UploadSummaryTableRow) => () => {
    if (
      !this.props.requestsInProgress.includes(
        `${AsyncRequest.RETRY_UPLOAD}-${row.jobName}`
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

  private editJob = (row: UploadSummaryTableRow) => () => {
    this.props.openEditFileMetadataTab(row);
  };

  private closeModal = () => {
    this.props.clearFileMetadataForJob();
    this.setState({ selectedJobId: undefined, selectedRowInJob: undefined });
  };
}

function mapStateToProps(state: State) {
  return {
    fileMetadataForJob: getFileMetadataForJob(state),
    fileMetadataForJobHeader: getFileMetadataForJobHeader(state),
    fileMetadataForJobLoading: getRequestsInProgressContains(
      state,
      AsyncRequest.GET_FILE_METADATA_FOR_JOB
    ),
    files: getStagedFiles(state),
    jobFilter: getJobFilter(state),
    jobs: getJobsForTable(state),
    page: getPage(state),
    requestsInProgress: getRequestsInProgress(state),
    requestingJobs: getRequestsInProgressContains(state, AsyncRequest.GET_JOBS),
  };
}

const dispatchToPropsMap = {
  cancelUpload,
  clearFileMetadataForJob,
  openEditFileMetadataTab,
  requestFileMetadataForJob,
  retryUpload,
  selectJobFilter,
  selectPage,
  selectView,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
