import { Table } from "antd";
import { ColumnProps } from "antd/lib/table";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import { getJobsForTable } from "../../state/job/selectors";
import { selectPage } from "../../state/selection/actions";
import { Page, SelectPageAction } from "../../state/selection/types";
import { State } from "../../state/types";

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow {
    // used by antd's Table component to uniquely identify rows
    key: string;
    jobId: string;
    status: string;
    created: string;
}

interface Props {
    className?: string;
    jobs: UploadSummaryTableRow[];
    selectPage: ActionCreator<SelectPageAction>;
}

class UploadSummary extends React.Component<Props, {}> {
    private columns: Array<ColumnProps<UploadSummaryTableRow>> = [
        {
            dataIndex: "jobId",
            key: "jobId",
            title: "Job Id",
        },
        {
            dataIndex: "status",
            key: "status",
            title: "Status",
        },
        {
            dataIndex: "created",
            key: "created",
            title: "Created",
        },
    ];

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    public render() {
        const {
            className,
            jobs,
        } = this.props;
        return (
            <FormPage
                className={className}
                formTitle="UPLOAD STATUSES"
                formPrompt=""
                onBack={this.goToDragAndDrop}
                backButtonName="Create New Upload Job"
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
    selectPage,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
