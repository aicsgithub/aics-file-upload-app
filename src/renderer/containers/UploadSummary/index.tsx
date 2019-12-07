import { JSSJob, JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { Alert, Button, Col, Empty, Modal, Radio, Row, Table } from "antd";
import { RadioChangeEvent } from "antd/es/radio";
import { ColumnProps } from "antd/lib/table";
import { shell } from "electron";
import { map } from "lodash";
import os from "os";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import StatusCircle from "../../components/StatusCircle";
import UploadJobDisplay from "../../components/UploadJobDisplay";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AlertType, AsyncRequest } from "../../state/feedback/types";
import { retrieveJobs, selectJobFilter } from "../../state/job/actions";
import {
    getAreAllJobsComplete,
    getJobFilter,
    getJobsForTable
} from "../../state/job/selectors";
import {
    JobFilter,
    RetrieveJobsAction,
    SelectJobFilterAction,
} from "../../state/job/types";
import { getFileMetadataForJob, getFileMetadataForJobHeader } from "../../state/metadata/selectors";
import { SearchResultRow } from "../../state/metadata/types";
import { selectPage, selectView } from "../../state/route/actions";
import { getPage } from "../../state/route/selectors";
import { Page, SelectViewAction } from "../../state/route/types";
import { getStagedFiles } from "../../state/selection/selectors";
import { SelectPageAction, UploadFile } from "../../state/selection/types";
import { State } from "../../state/types";
import { cancelUpload, retryUpload } from "../../state/upload/actions";
import { CancelUploadAction, RetryUploadAction } from "../../state/upload/types";
import FileMetadataModal from "../SearchFiles/FileMetadataModal";
import Timeout = NodeJS.Timeout;

const styles = require("./styles.pcss");

const jobStatusOptions: JobFilter[] = map(JobFilter, (value) => value);

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow extends JSSJob {
    // used by antd's Table component to uniquely identify rows
    key: string;
}

interface Props {
    allJobsComplete: boolean;
    cancelUpload: ActionCreator<CancelUploadAction>;
    className?: string;
    fileMetadataForJob?: SearchResultRow[];
    fileMetadataForJobHeader?: ColumnProps<SearchResultRow>[];
    files: UploadFile[];
    loading: boolean;
    jobFilter: JobFilter;
    jobs: UploadSummaryTableRow[];
    page: Page;
    retrieveJobs: ActionCreator<RetrieveJobsAction>;
    retryUpload: ActionCreator<RetryUploadAction>;
    selectPage: ActionCreator<SelectPageAction>;
    selectView: ActionCreator<SelectViewAction>;
    selectJobFilter: ActionCreator<SelectJobFilterAction>;
}

interface UploadSummaryState {
    selectedJobId?: string
    selectedRowInUpload?: SearchResultRow;
}

class UploadSummary extends React.Component<Props, UploadSummaryState> {
    private columns: Array<ColumnProps<UploadSummaryTableRow>> = [
        {
            align: "center",
            dataIndex: "status",
            key: "status",
            render: (status: JSSJobStatus) => <StatusCircle status={status}/>,
            title: "Status",
        },
        {
            dataIndex: "jobName",
            key: "jobName",
            title: "Job Name",
        },
        {
            dataIndex: "currentStage",
            key: "currentStage",
            title: "Current Stage",
        },
        {
            dataIndex: "modified",
            key: "modified",
            render: (modified: Date) => modified.toLocaleString(),
            title: "Last Modified",
        },
    ];
    private interval: Timeout | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    public componentDidMount(): void {
        this.setJobInterval();
    }

    public componentWillUnmount(): void {
        this.clearJobInterval();
    }

    public render() {
        const {
            className,
            fileMetadataForJob,
            fileMetadataForJobHeader,
            jobFilter,
            jobs,
            loading,
            page,
        } = this.props;
        const selectedJob = this.getSelectedJob();
        return (
            <FormPage
                className={className}
                formTitle="YOUR UPLOADS"
                formPrompt="Your upload jobs will appear below"
                onSave={this.onFormSave}
                saveButtonName={page !== Page.UploadSummary ? "Resume Upload Job" : "Create New Upload Job"}
                page={Page.UploadSummary}
            >
                {!this.interval && (
                    <Row className={styles.refreshContainer}>
                        <Col xs={4}>
                            <Button
                                size="large"
                                type="primary"
                                onClick={this.setJobInterval}
                            >Refresh Jobs
                            </Button>
                        </Col>
                        <Col xs={20}>
                            <Alert
                                type="info"
                                message="Uploads no longer auto-updating, click refresh to begin updating again"
                            />
                        </Col>
                    </Row>
                )}
                <Row>
                    Show{' '}
                    <Radio.Group buttonStyle="solid" onChange={this.selectJobFilter} value={jobFilter}>
                        {jobStatusOptions.map((option) => (
                            <Radio.Button key={option} value={option}>{option}</Radio.Button>
                        ))}
                    </Radio.Group>
                    {' '}Uploads
                </Row>
                {jobs.length ? (
                    <Table
                        className={styles.jobTable}
                        columns={this.columns}
                        dataSource={jobs}
                        onRow={this.onRow}
                    />
                ) : (
                    <Empty
                        className={styles.empty}
                        description={`No ${jobFilter === JobFilter.All ? "" : `${jobFilter} `} Uploads`}
                    />
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
                       toggleFileDetailModal={this.toggleFileDetailModal}
                   />
                    <FileMetadataModal
                        fileMetadata={undefined}
                        onBrowse={this.onBrowseToFile}
                        toggleFileDetailModal={this.toggleFileDetailModal}
                    />
                </Modal>}
            </FormPage>
        );
    }



    private toggleFileDetailModal = (e?: any, selectedRowInUpload?: SearchResultRow): void => {
        this.setState({ selectedRowInUpload });
    }

    private onBrowseToFile = (filePath: string) => {
        let downloadPath;
        const userOS = os.type();
        if (userOS === "") { // TODO:
            downloadPath = filePath.replace(/\//g, '\\');
        } else if (userOS === "") { // TODO:
            downloadPath = filePath;
        } else { // Linux
            downloadPath = filePath;
        }
        if (!shell.showItemInFolder(downloadPath)) {
            setAlert({
                message: "Failed to browse to file, contact software or browse to file path " +
                    "using files path(s) shown in metadata",
                type: AlertType.ERROR
            });
        }
    }

    private selectJobFilter = (e: RadioChangeEvent): void => {
        if (!this.interval) {
            this.setJobInterval();
        }
        this.props.selectJobFilter(e.target.value);
    }

    // Auto-refresh jobs every 2 seconds for 3 minutes
    private setJobInterval = (): void => {
        this.interval = setInterval(this.props.retrieveJobs, 1000); // 1 seconds
        setTimeout(() => this.clearJobInterval(true), 300000); // 5 minutes
    }

    // Stop auto-refreshing jobs
    private clearJobInterval = (checkIfJobsComplete: boolean = false): void => {
        if (this.interval && (!checkIfJobsComplete || this.props.allJobsComplete)) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private getSelectedJob = (): UploadSummaryTableRow | undefined => {
        const {jobs} = this.props;
        const {selectedJobId} = this.state;
        return jobs.find((j) => j.jobId === selectedJobId);
    }

    private cancelUpload = (): void => {
        // Start refreshing again if we aren't
        if (!this.interval) {
            this.setJobInterval();
        }
        this.props.cancelUpload(this.getSelectedJob());
    }

    private retryUpload = (): void => {
        // Start refreshing again if we aren't
        if (!this.interval) {
            this.setJobInterval();
        }
        this.props.retryUpload(this.getSelectedJob());
    }

    private onFormSave = (): void => {
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

    private onRow = (record: UploadSummaryTableRow) => {
        return {
            onClick: () => {
                this.setState({selectedJobId: record.jobId});
            },
        };
    }

    private closeModal = () => {
        // TODO: clear fileMetadataForJob && fileMetadataForJobHeader
        this.setState({ selectedJobId: undefined, selectedRowInUpload: undefined });
    }
}

function mapStateToProps(state: State) {
    return {
        allJobsComplete: getAreAllJobsComplete(state),
        fileMetadataForJob: getFileMetadataForJob(state),
        fileMetadataForJobHeader: getFileMetadataForJobHeader(state),
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
    retrieveJobs,
    retryUpload,
    selectJobFilter,
    selectPage,
    selectView,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
