import { Button, Table } from "antd";
import { ColumnProps } from "antd/lib/table";
import { isEmpty } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import { goBack, goForward } from "../../state/selection/actions";
import { GoBackAction, NextPageAction } from "../../state/selection/types";
import { State } from "../../state/types";
import { initiateUpload, jumpToUpload, removeUploads } from "../../state/upload/actions";
import { getCanRedoUpload, getCanUndoUpload, getUploadSummaryRows } from "../../state/upload/selectors";
import {
    InitiateUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    UploadJobTableRow
} from "../../state/upload/types";
import { alphaOrderComparator } from "../../util";

const styles = require("./style.pcss");

interface Props {
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    initiateUpload: ActionCreator<InitiateUploadAction>;
    jumpToUpload: ActionCreator<JumpToUploadAction>;
    uploads: UploadJobTableRow[];
}

interface UploadJobState {
    // array of fullpaths
    selectedFiles: string[];
}

class UploadJob extends React.Component<Props, UploadJobState> {
    private columns: Array<ColumnProps<UploadJobTableRow>> = [
        {
            dataIndex: "barcode",
            key: "barcode",
            sortDirections: ["ascend", "descend"],
            sorter: (a, b) => alphaOrderComparator(a.barcode, b.barcode),
            title: "Barcode",
        },
        {
            dataIndex: "file",
            key: "file",
            sortDirections: ["ascend", "descend"],
            sorter: (a, b) => alphaOrderComparator(a.file, b.file),
            title: "File",
        },
        {
            dataIndex: "wellLabels",
            key: "wellLabels",
            title: "Well(s)",
        },
        {
            key: "action",
            render: (text: string, record: UploadJobTableRow) => (<a onClick={this.removeUpload(record)}>Remove</a>),
            title: "Action",
        }];

    private get rowSelection() {
        return {
            hideDefaultSelections: true,
            onChange: this.onSelectChange,
            selectedRowKeys: this.state.selectedFiles,
            selections: [
                {
                    key: "all-data",
                    onSelect: () => this.setState({
                        selectedFiles: this.props.uploads.map((u) => u.file),
                    }),
                    text: "Select all pages",
                },
            ],
        };
    }

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedFiles: [],
        };
    }

    public render() {
        const {
            className,
            uploads,
        } = this.props;

        return (
            <FormPage
                className={className}
                formTitle="UPLOAD JOB"
                formPrompt="Review files below and click Upload to submit a job."
                onSave={this.upload}
                saveButtonName="Upload"
                onBack={this.props.goBack}
            >
                {this.renderButtons()}
                <Table columns={this.columns} dataSource={uploads} rowSelection={this.rowSelection}/>
            </FormPage>
        );
    }

    private renderButtons = () => {
        const {
            canRedo,
            canUndo,
        } = this.props;
        const {selectedFiles} = this.state;

        return (
            <div className={styles.buttonRow}>
                <div className={styles.deleteButton}>
                    <Button onClick={this.removeUploads} disabled={isEmpty(selectedFiles)}>
                        Remove Selected
                    </Button>
                </div>
                <div className={styles.undoRedoButtons}>
                    <Button className={styles.undoButton} onClick={this.undo} disabled={!canUndo}>Undo</Button>
                    <Button className={styles.redoButton} onClick={this.redo} disabled={!canRedo}>Redo</Button>
                </div>
            </div>
        );
    }

    private upload = (): void => {
        this.props.initiateUpload();
        this.props.goForward();
    }

    private removeUpload = (upload: UploadJobTableRow) => {
        return () => {
            this.setState({selectedFiles: []});
            this.props.removeUploads([upload.file]);
        };
    }

    private removeUploads = (): void => {
        this.setState({selectedFiles: []});
        this.props.removeUploads(this.state.selectedFiles);
    }

    private onSelectChange = (selectedFiles: string[] | number[]): void => {
        // keys are always defined on the rows as a string so we can safely cast this:
        const files = selectedFiles as string[];
        this.setState({selectedFiles: files});
    }

    private undo = (): void => {
        this.props.jumpToUpload(-1);
    }

    private redo = (): void => {
        this.props.jumpToUpload(1);
    }
}

function mapStateToProps(state: State) {
    return {
        canRedo: getCanRedoUpload(state),
        canUndo: getCanUndoUpload(state),
        uploads: getUploadSummaryRows(state),
    };
}

const dispatchToPropsMap = {
    goBack,
    goForward,
    initiateUpload,
    jumpToUpload,
    removeUploads,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadJob);
