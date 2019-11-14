import { JSSJob, JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { Alert, Button, Col, Modal, Row, Table } from "antd";
import { ColumnProps } from "antd/lib/table";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import StatusCircle from "../../components/StatusCircle";
import UploadJobDisplay from "../../components/UploadJobDisplay";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest } from "../../state/feedback/types";
import { retrieveJobs } from "../../state/job/actions";
import { getAreAllJobsComplete, getJobsForTable } from "../../state/job/selectors";
import { RetrieveJobsAction } from "../../state/job/types";
import { selectPage, selectView } from "../../state/selection/actions";
import { getPage, getStagedFiles } from "../../state/selection/selectors";
import { Page, SelectPageAction, SelectViewAction, UploadFile } from "../../state/selection/types";
import { State } from "../../state/types";
import { cancelUpload, retryUpload } from "../../state/upload/actions";
import { CancelUploadAction, RetryUploadAction } from "../../state/upload/types";
import Timeout = NodeJS.Timeout;

const styles = require("./styles.pcss");

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow extends JSSJob {
    // used by antd's Table component to uniquely identify rows
    key: string;
}

interface Props {
    allJobsComplete: boolean;
    cancelUpload: ActionCreator<CancelUploadAction>;
    className?: string;
    files: UploadFile[];
    loading: boolean;
    jobs: UploadSummaryTableRow[];
    page: Page;
    retrieveJobs: ActionCreator<RetrieveJobsAction>;
    retryUpload: ActionCreator<RetryUploadAction>;
    selectPage: ActionCreator<SelectPageAction>;
    selectView: ActionCreator<SelectViewAction>;
}

interface UploadSummaryState {
    selectedJobId?: string;
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
            jobs,
            loading,
            page,
        } = this.props;
        const selectedJob = this.getSelectedJob();
        return (
            <FormPage
                className={className}
                formTitle="YOUR UPLOADS"
                formPrompt=""
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
                <Table
                    className={styles.jobTable}
                    columns={this.columns}
                    dataSource={jobs}
                    onRow={this.onRow}
                />
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
                   />
                </Modal>}
            </FormPage>
        );
    }

    // Auto-refresh jobs every 2 seconds for 3 minutes
    private setJobInterval = (): void => {
        this.interval = setInterval(this.props.retrieveJobs, 2000); // 2 seconds
        setTimeout(() => this.clearJobInterval(true), 180000); // 3 minutes
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
        this.props.cancelUpload(this.getSelectedJob());
    }

    private retryUpload = (): void => {
        this.props.retryUpload(this.getSelectedJob());
    }

    private onFormSave = (): void => {
        // If the current page is UploadSummary we must just be a view
        if (this.props.page !== Page.UploadSummary) {
            this.props.selectView(this.props.page);
        } else if (this.props.files.length > 0) {
            // If we already have files staged skip the drag and drop page
            this.props.selectPage(Page.UploadSummary, Page.EnterBarcode);
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
        this.setState({selectedJobId: undefined});
    }
}

function mapStateToProps(state: State) {
    return {
        allJobsComplete: getAreAllJobsComplete(state),
        files: getStagedFiles(state),
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
    selectPage,
    selectView,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
