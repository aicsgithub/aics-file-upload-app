import { JSSJob, JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { Modal, Table } from "antd";
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
import { retryUpload } from "../../state/upload/actions";
import { RetryUploadAction } from "../../state/upload/types";
import Timeout = NodeJS.Timeout;

const styles = require("./styles.pcss");

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow extends JSSJob {
    // used by antd's Table component to uniquely identify rows
    key: string;
}

interface Props {
    allJobsComplete: boolean;
    className?: string;
    files: UploadFile[];
    jobs: UploadSummaryTableRow[];
    page: Page;
    retrieveJobs: ActionCreator<RetrieveJobsAction>;
    retrying: boolean;
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
        this.interval = setInterval(this.props.retrieveJobs, 1000);
    }

    public componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any): void {
        if (this.interval && this.props.allJobsComplete) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    public componentWillUnmount(): void {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    public render() {
        const {
            className,
            jobs,
            page,
            retrying,
        } = this.props;
        const selectedJob = this.getSelectedJob();
        return (
            <FormPage
                className={className}
                formTitle="YOUR UPLOADS"
                formPrompt=""
                onSave={this.onFormSave}
                saveButtonName={page !== Page.UploadSummary ? "Resume Upload Job" : "Create New Upload Job"}
            >
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
                   <UploadJobDisplay job={selectedJob} retryUpload={this.retryUpload} retrying={retrying}/>
                </Modal>}
            </FormPage>
        );
    }

    private getSelectedJob = (): UploadSummaryTableRow | undefined => {
        const {jobs} = this.props;
        const {selectedJobId} = this.state;
        return jobs.find((j) => j.jobId === selectedJobId);
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
        page: getPage(state),
        retrying: getRequestsInProgressContains(state, AsyncRequest.RETRY_UPLOAD),
    };
}

const dispatchToPropsMap = {
    retrieveJobs,
    retryUpload,
    selectPage,
    selectView,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
