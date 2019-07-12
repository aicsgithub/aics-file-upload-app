import { JSSJob, JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { Modal, Table } from "antd";
import { ColumnProps } from "antd/lib/table";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import StatusCircle from "../../components/StatusCircle";
import UploadJobDisplay from "../../components/UploadJobDisplay";
import { retrieveJobs } from "../../state/job/actions";
import { getJobsForTable } from "../../state/job/selectors";
import { RetrieveJobsAction } from "../../state/job/types";
import { selectPage } from "../../state/selection/actions";
import { Page, SelectPageAction } from "../../state/selection/types";
import { State } from "../../state/types";
import Timeout = NodeJS.Timeout;

const styles = require("./styles.pcss");

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow extends JSSJob {
    // used by antd's Table component to uniquely identify rows
    key: string;
}

interface Props {
    className?: string;
    jobs: UploadSummaryTableRow[];
    retrieveJobs: ActionCreator<RetrieveJobsAction>;
    selectPage: ActionCreator<SelectPageAction>;
}

interface UploadSummaryState {
    selectedJob?: UploadSummaryTableRow;
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
    private interval!: Timeout;

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    public componentDidMount(): void {
        this.interval = setInterval(this.props.retrieveJobs, 1000);
    }

    public componentWillUnmount(): void {
        clearInterval(this.interval);
    }

    public render() {
        const {
            className,
            jobs,
        } = this.props;
        const { selectedJob } = this.state;
        return (
            <FormPage
                className={className}
                formTitle="YOUR UPLOADS"
                formPrompt=""
                onSave={this.goToDragAndDrop}
                saveButtonName="Create New Upload Job"
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
                   <UploadJobDisplay job={selectedJob}/>
                </Modal>}
            </FormPage>
        );
    }

    private goToDragAndDrop = (): void => {
        this.props.selectPage(Page.UploadSummary, Page.DragAndDrop);
    }

    private onRow = (record: UploadSummaryTableRow, rowIndex: number) => {
        return {
            onClick: () => {
                this.setState({selectedJob: record});
            },
        };
    }

    private closeModal = () => {
        this.setState({selectedJob: undefined});
    }
}

function mapStateToProps(state: State) {
    return {
        jobs: getJobsForTable(state),
    };
}

const dispatchToPropsMap = {
    retrieveJobs,
    selectPage,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
