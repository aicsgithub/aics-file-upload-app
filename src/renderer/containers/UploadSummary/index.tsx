import { JSSJob, JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { Button, Col, Empty, Icon, Modal, Progress, Radio, Row, Table } from "antd";
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
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest } from "../../state/feedback/types";
import {
    gatherIncompleteJobNames,
    retrieveJobs,
    selectJobFilter,
    stopJobPoll,
} from "../../state/job/actions";
import {
    getAreAllJobsComplete,
    getJobFilter,
    getJobsForTable,
} from "../../state/job/selectors";
import {
    GatherIncompleteJobNamesAction,
    JobFilter,
    RetrieveJobsAction,
    SelectJobFilterAction,
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
import { Page, SelectViewAction } from "../../state/route/types";
import { getStagedFiles } from "../../state/selection/selectors";
import { SelectPageAction, UploadFile } from "../../state/selection/types";
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
    loading: boolean;
    jobFilter: JobFilter;
    jobs: UploadSummaryTableRow[];
    page: Page;
    requestFileMetadataForJob: ActionCreator<RequestFileMetadataForJobAction>;
    retrieveJobs: ActionCreator<RetrieveJobsAction>;
    retryUpload: ActionCreator<RetryUploadAction>;
    selectPage: ActionCreator<SelectPageAction>;
    selectView: ActionCreator<SelectViewAction>;
    selectJobFilter: ActionCreator<SelectJobFilterAction>;
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
    private columns: Array<ColumnProps<UploadSummaryTableRow>> = [
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
                <Progress
                    showInfo={false}
                    status="active"
                    percent={UploadSummary.STAGE_TO_PROGRESS(stage)}
                    successPercent={50}
                />
            ) : (row.serviceFields && row.serviceFields.replacementJobId ? "REPLACED" : row.status),
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
    ];

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
            jobFilter,
            jobs,
            loading,
            page,
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
                        <Radio.Group onChange={this.selectJobFilter} value={jobFilter} className={styles.filters}>
                            {jobStatusOptions.map((option) => (
                                <Radio.Button key={option} value={option}>{option}</Radio.Button>
                            ))}
                        </Radio.Group>
                    </div>
                    {jobs.length ? (
                        <Table
                            className={classNames(styles.content, styles.jobTable)}
                            columns={this.columns}
                            dataSource={jobs}
                            onRow={this.onRow}
                        />
                    ) : (
                        <div className={classNames(styles.content, styles.empty)}>
                            <Empty
                                description={`No ${jobFilter === JobFilter.All ? "" : `${jobFilter} `} Uploads`}
                            />
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
                            cancelUpload={this.cancelUpload}
                            job={selectedJob}
                            retryUpload={this.retryUpload}
                            loading={loading}
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

    private getSelectedJob = (): UploadSummaryTableRow | undefined => {
        const {jobs} = this.props;
        const {selectedJobId} = this.state;
        return jobs.find((j) => j.jobId === selectedJobId);
    }

    private cancelUpload = (): void => {
        // Start refreshing again if we aren't
        this.props.retrieveJobs();
        this.props.cancelUpload(this.getSelectedJob());
    }

    private retryUpload = (): void => {
        // Start refreshing again if we aren't
        this.props.retrieveJobs();
        this.props.retryUpload(this.getSelectedJob());
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

    private onRow = (record: UploadSummaryTableRow) => {
        return {
            onClick: () => {
                this.requestFileMetadataForJob(record.jobId);
                this.setState({selectedJobId: record.jobId});
            },
        };
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
        jobFilter: getJobFilter(state),
        jobs: getJobsForTable(state),
        loading: getRequestsInProgressContains(state, AsyncRequest.RETRY_UPLOAD)
            || getRequestsInProgressContains(state, AsyncRequest.CANCEL_UPLOAD),
        page: getPage(state),
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
    stopJobPoll,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
