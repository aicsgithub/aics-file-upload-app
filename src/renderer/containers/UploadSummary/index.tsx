import { Table } from "antd";
import { ColumnProps } from "antd/lib/table";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import { getUploadStatus } from "../../state/job/selectors";
import { selectPage } from "../../state/selection/actions";
import { Page, SelectPageAction } from "../../state/selection/types";
import { State } from "../../state/types";
import { UploadSummaryTableRow } from "../../state/upload/types";

interface Props {
    className?: string;
    selectPage: ActionCreator<SelectPageAction>;
    uploadStatus: string;
}

class UploadSummary extends React.Component<Props, {}> {
    private columns: Array<ColumnProps<UploadSummaryTableRow>> = [
        {
            dataIndex: "id",
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
            uploadStatus,
        } = this.props;
        return (
            <FormPage
                className={className}
                formTitle="UPLOAD STATUSES"
                formPrompt=""
                onBack={this.goToDragAndDrop}
                backButtonName="Create New Upload Job"
            >
                <div>Current Upload: {uploadStatus}</div>
                <Table columns={this.columns} dataSource={this.getUploadJobs()}/>
            </FormPage>
        );
    }

    private getUploadJobs(): any[] {
        // todo: get jobs from JSS
        return [];
    }

    private goToDragAndDrop = (): void => {
        this.props.selectPage(Page.UploadSummary, Page.DragAndDrop);
    }
}

function mapStateToProps(state: State) {
    return {
        uploadStatus: getUploadStatus(state),
    };
}

const dispatchToPropsMap = {
    selectPage,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadSummary);
