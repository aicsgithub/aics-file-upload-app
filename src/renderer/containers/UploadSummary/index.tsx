import { JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { Table } from "antd";
import { ColumnProps } from "antd/lib/table";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import StatusCircle from "../../components/StatusCircle";
import { retrieveJobs } from "../../state/job/actions";
import { getJobsForTable } from "../../state/job/selectors";
import { RetrieveJobsAction } from "../../state/job/types";
import { selectPage } from "../../state/selection/actions";
import { Page, SelectPageAction } from "../../state/selection/types";
import { State } from "../../state/types";
import Timeout = NodeJS.Timeout;

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow {
    // used by antd's Table component to uniquely identify rows
    key: string;
    jobName: string;
    stage: string;
    status: JSSJobStatus;
    modified: string;
}

interface Props {
    className?: string;
    jobs: UploadSummaryTableRow[];
    retrieveJobs: ActionCreator<RetrieveJobsAction>;
    selectPage: ActionCreator<SelectPageAction>;
}

class UploadSummary extends React.Component<Props, {}> {
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
            dataIndex: "stage",
            key: "currentStage",
            title: "Current Stage",
        },
        {
            dataIndex: "modified",
            key: "modified",
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
        return (
            <FormPage
                className={className}
                formTitle="YOUR UPLOADS"
                formPrompt=""
                onSave={this.goToDragAndDrop}
                saveButtonName="Create New Upload Job"
            >
                <Table columns={this.columns} dataSource={jobs}/>
            </FormPage>
        );
    }

    private goToDragAndDrop = (): void => {
        this.props.selectPage(Page.UploadSummary, Page.DragAndDrop);
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
