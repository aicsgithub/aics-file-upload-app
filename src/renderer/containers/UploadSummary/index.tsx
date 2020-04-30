import { JSSJob, JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { Button, Col, Empty, Icon, Modal, Progress, Radio, Row, Spin, Switch, Table, Tooltip } from "antd";
import { RadioChangeEvent } from "antd/es/radio";
import { ColumnProps } from "antd/lib/table";
import * as classNames from "classnames";
import { remote } from "electron";
import { capitalize, isEmpty, map } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FileMetadataModal from "../../components/FileMetadataModal";
import StatusCircle from "../../components/StatusCircle";
import UploadJobDisplay from "../../components/UploadJobDisplay";
import { FAILED_STATUS, IN_PROGRESS_STATUSES } from "../../state/constants";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest } from "../../state/feedback/types";
import {
    gatherIncompleteJobNames,
    retrieveJobs,
    selectJobFilter,
    startJobPoll,
    stopJobPoll,
} from "../../state/job/actions";
import {
    getAreAllJobsComplete,
    getIsPolling,
    getJobFilter,
    getJobsForTable,
} from "../../state/job/selectors";
import {
    GatherIncompleteJobNamesAction,
    JobFilter,
    RetrieveJobsAction,
    SelectJobFilterAction,
    StartJobPollAction,
    StopJobPollAction,
} from "../../state/job/types";
import { clearFileMetadataForJob, requestFileMetadataForJob } from "../../state/metadata/actions";
import { getFileMetadataForJob, getFileMetadataForJobHeader } from "../../state/metadata/selectors";
import {
    ClearFileMetadataForJobAction,
    RequestFileMetadataForJobAction,
    SearchResultRow,
    SearchResultsHeader
} from "../../state/metadata/types";
import { selectPage, selectView } from "../../state/route/actions";
import { getPage } from "../../state/route/selectors";
import { Page, SelectPageAction, SelectViewAction } from "../../state/route/types";
import { getStagedFiles } from "../../state/selection/selectors";
import { UploadFile } from "../../state/selection/types";
import { State } from "../../state/types";
import { cancelUpload, retryUpload } from "../../state/upload/actions";
import { CancelUploadAction, RetryUploadAction, UploadMetadata } from "../../state/upload/types";

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

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow extends JSSJob {
    // used by antd's Table component to uniquely identify rows
    key: string;
}

interface Props {
    allJobsComplete: boolean;
    cancelUpload: ActionCreator<CancelUploadAction>;
    className?: string;
    clearFileMetadataForJob: ActionCreator<ClearFileMetadataForJobAction>;
    fileMetadataForJob?: SearchResultRow[];
    fileMetadataForJobHeader?: SearchResultsHeader[];
    fileMetadataForJobLoading: boolean;
    files: UploadFile[];
    gatherIncompleteJobNames: ActionCreator<GatherIncompleteJobNamesAction>;
    isPolling: boolean;
    loading: boolean;
    jobFilter: JobFilter;
    jobs: UploadSummaryTableRow[];
    page: Page;
    requestFileMetadataForJob: ActionCreator<RequestFileMetadataForJobAction>;
    requestingJobs: boolean;
    retrieveJobs: ActionCreator<RetrieveJobsAction>;
    retryUpload: ActionCreator<RetryUploadAction>;
    selectPage: ActionCreator<SelectPageAction>;
    selectView: ActionCreator<SelectViewAction>;
    selectJobFilter: ActionCreator<SelectJobFilterAction>;
    startJobPoll: ActionCreator<StartJobPollAction>;
    stopJobPoll: ActionCreator<StopJobPollAction>;
}

interface UploadSummaryState {
    selectedJobId?: string;
    selectedRowInJob?: SearchResultRow;
}

class UploadSummary extends React.Component<Props, UploadSummaryState> {

    private static STAGE_TO_PROGRESS = (stage: string): number => {
        if (stage.toLowerCase() === "copy file") {
            return 25;
        }
        if (stage.toLowerCase() === "waiting for file copy") {
            return 50;
        }
        if (stage.toLowerCase() === "create filerows in labkey") {
            return 75;
        }
        return 0;
    }

    private timeout: number | undefined;
    private get columns(): Array<ColumnProps<UploadSummaryTableRow>> {
        return [
            {
                align: "center",
                dataIndex: "status",
                key: "status",
                render: (status: JSSJobStatus) => <StatusCircle status={status}/>,
                title: "Status",
                width: "90px",
            },
            {
                dataIndex: "currentStage",
                key: "currentStage",
                render: (stage: string, row) => !["SUCCEEDED", "UNRECOVERABLE", "FAILED"].includes(row.status) ? (
                    <div className={styles.progressContainer}>
                        <Progress
                            showInfo={false}
                            status="active"
                            percent={UploadSummary.STAGE_TO_PROGRESS(stage)}
                            successPercent={50}
                        />
                        {!this.props.isPolling && (
                            <Tooltip
                                mouseLeaveDelay={0}
                                title="Polling is not turned on - progress might not be accurate."
                            >
                                <Icon className={styles.warningIcon} type="warning"/>
                            </Tooltip>
                        )}
                    </div>
                ) : (row.serviceFields && row.serviceFields.replacementJobId ? "Replaced" : capitalize(row.status)),
                title: "Progress",
                width: "190px",
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
                render: (modified: Date) => modified.toLocaleTimeString([], TIME_DISPLAY_CONFIG),
                title: "Last Modified",
                width: "300px",
            },
            {
                key: "action",
                render: (_: any, row: UploadSummaryTableRow) => (
                    <>
                        <a className={styles.action} onClick={this.viewJob(row)}>View</a>
                        {row.status === FAILED_STATUS && (
                            <a
                                className={classNames(styles.action, {[styles.disabled]: this.props.loading})}
                                onClick={this.retryJob(row)}
                            >
                                Retry
                            </a>
                        )}
                        {IN_PROGRESS_STATUSES.includes(row.status) && (
                            <a
                                className={classNames(styles.action, {[styles.disabled]: this.props.loading})}
                                onClick={this.cancelJob(row)}
                            >
                                Stop
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

    public componentDidMount(): void {
        this.props.retrieveJobs();
        this.props.gatherIncompleteJobNames();
    }

    public componentWillUnmount(): void {
        this.clearJobInterval();
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }

    public render() {
        const {
            className,
            fileMetadataForJob,
            fileMetadataForJobHeader,
            fileMetadataForJobLoading,
            isPolling,
            jobFilter,
            jobs,
            page,
            requestingJobs,
        } = this.props;
        const { selectedRowInJob } = this.state;
        const selectedJob = this.getSelectedJob();
        const buttonLabel = page !== Page.UploadSummary ? <>Resume Upload</> :
            <><Icon type="plus"/>&nbsp;New Upload</>;
        return (
            <div className={classNames(styles.container, className)}>
                <div className={styles.section}>
                    <div className={styles.header}>
                        <Row type="flex" justify="space-between" align="middle" className={styles.title}>
                            <Col><h2>Your Uploads</h2></Col>
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
                                        <Radio.Button key={option} value={option}>{option}</Radio.Button>
                                    ))}
                                </Radio.Group>
                            </Col>
                            <Col>Polling for Uploads is&nbsp;
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
                            {requestingJobs ? <Spin size="large"/> :
                              <Empty description={`No ${jobFilter === JobFilter.All ? "" : `${jobFilter} `} Uploads`}/>
                            }
                        </div>
                    )}
                    {selectedJob && <Modal
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
                    </Modal>}
                </div>
            </div>
        );
    }

    private openFileDetailModal = (selectedRowInJob: SearchResultRow): void => {
        this.setState({ selectedRowInJob });
    }

    private closeFileDetailModal = (): void => {
        this.setState({ selectedRowInJob: undefined });
    }

    private selectJobFilter = (e: RadioChangeEvent): void => {
        this.props.selectJobFilter(e.target.value);
        this.props.retrieveJobs();
    }

    // Stop auto-refreshing jobs
    private clearJobInterval = (checkIfJobsComplete: boolean = false): void => {
        if (!checkIfJobsComplete || this.props.allJobsComplete) {
            this.props.stopJobPoll();
        }
    }

    private togglePoll = () => this.props.isPolling ? this.props.stopJobPoll() : this.props.startJobPoll();

    private getSelectedJob = (): UploadSummaryTableRow | undefined => {
        const {jobs} = this.props;
        const {selectedJobId} = this.state;
        return jobs.find((j) => j.jobId === selectedJobId);
    }

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
    }

    private requestFileMetadataForJob = (jobId: string): void => {
        const { jobs } = this.props;
        const job = jobs.find((j) => j.jobId === jobId);
        if (job
            && job.serviceFields
            && job.serviceFields.files
            && Array.isArray(job.serviceFields.result)
            && !isEmpty(job.serviceFields.result)) {
            const fileIds = job.serviceFields.result.map((fileInfo: UploadMetadata) => {
                return fileInfo.fileId;
            });
            this.props.requestFileMetadataForJob(fileIds);
        }
    }

    private viewJob = (row: UploadSummaryTableRow) => () => {
        this.requestFileMetadataForJob(row.jobId);
        this.setState({selectedJobId: row.jobId});
    }

    private retryJob = (row: UploadSummaryTableRow) => () => {
        if (!this.props.loading) {
            this.props.retryUpload(row);
        }
    }

    private cancelJob = (row: UploadSummaryTableRow) => () => {
        if (!this.props.loading) {
            remote.dialog.showMessageBox({
                buttons: ["Cancel", "Yes"],
                message: "If you cancel this upload, you'll have to start the upload process for these files from the beginning again.",
                title: "Danger!",
                type: "warning",
            }, (response: number) => {
                if (response === 1) {
                    this.props.cancelUpload(row);
                }
            });
        }
    }

    private closeModal = () => {
        this.props.clearFileMetadataForJob();
        this.setState({ selectedJobId: undefined, selectedRowInJob: undefined });
    }
}

function mapStateToProps(state: State) {
    return {
        allJobsComplete: getAreAllJobsComplete(state),
        fileMetadataForJob: getFileMetadataForJob(state),
        fileMetadataForJobHeader: getFileMetadataForJobHeader(state),
        fileMetadataForJobLoading: getRequestsInProgressContains(state, AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB),
        files: getStagedFiles(state),
        isPolling: getIsPolling(state),
        jobFilter: getJobFilter(state),
        jobs: getJobsForTable(state),
        loading: getRequestsInProgressContains(state, AsyncRequest.RETRY_UPLOAD)
            || getRequestsInProgressContains(state, AsyncRequest.CANCEL_UPLOAD),
        page: getPage(state),
        requestingJobs: getRequestsInProgressContains(state, AsyncRequest.GET_JOBS),
    };
}

const dispatchToPropsMap = {
    cancelUpload,
    clearFileMetadataForJob,
    gatherIncompleteJobNames,
    requestFileMetadataForJob,
    retrieveJobs,
    retryUpload,
    selectJobFilter,
    selectPage,
    selectView,
    startJobPoll,
    stopJobPoll,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
