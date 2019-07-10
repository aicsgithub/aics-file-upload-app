import { JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { Button, Table, Tooltip } from "antd";
import { ColumnProps } from "antd/lib/table";
import * as classNames from "classnames";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import { retrieveJobs } from "../../state/job/actions";
import { getJobsForTable, getNumberOfPendingJobs } from "../../state/job/selectors";
import { RetrieveJobsAction } from "../../state/job/types";
import { selectPage } from "../../state/selection/actions";
import { Page, SelectPageAction } from "../../state/selection/types";
import { State } from "../../state/types";

const styles = require("./styles.pcss");

export type StatusCircleClassName = "success" | "inProgress" | "error";

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow {
    // used by antd's Table component to uniquely identify rows
    key: string;
    jobName: string;
    stage: string;
    status: JSSJobStatus;
    statusCircleClassName?: StatusCircleClassName;
    modified: string;
}

interface Props {
    className?: string;
    jobs: UploadSummaryTableRow[];
    numberPendingJobs: number;
    retrieveJobs: ActionCreator<RetrieveJobsAction>;
    selectPage: ActionCreator<SelectPageAction>;
}

class UploadSummary extends React.Component<Props, {}> {
    private columns: Array<ColumnProps<UploadSummaryTableRow>> = [
        {
            align: "center",
            dataIndex: "statusCircleClassName",
            key: "statusCircleClassName",
            render: (status: StatusCircleClassName, row: UploadSummaryTableRow) => (
                <Tooltip placement="right" title={row.status}>
                    <div className={classNames(styles.statusCircle, styles[status])}/>
                </Tooltip>
            ),
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

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    public componentWillMount(): void {
        this.props.retrieveJobs();
    }

    public render() {
        const {
            className,
            jobs,
            numberPendingJobs,
        } = this.props;
        return (
            <FormPage
                className={className}
                formTitle="UPLOADS"
                formPrompt=""
                onBack={this.goToDragAndDrop}
                backButtonName="Create New Upload Job"
            >
                <div className={styles.pendingJobs}>Pending Jobs: {numberPendingJobs}</div>
                <div className={styles.tableControls}>
                    <Button onClick={this.props.retrieveJobs}>Refresh</Button>
                </div>
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
        numberPendingJobs: getNumberOfPendingJobs(state),
    };
}

const dispatchToPropsMap = {
    retrieveJobs,
    selectPage,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
