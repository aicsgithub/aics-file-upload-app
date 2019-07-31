import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import { isEmpty } from "lodash";
import { Button, Table } from "antd";
import { ColumnProps } from "antd/lib/table";
import { TableEventListeners } from "antd/es/table/interface";

import { getCanRedoUpload, getCanUndoUpload, getUploadSummaryRows } from "../../state/upload/selectors";
import { initiateUpload, jumpToUpload, removeUploads, updateUpload } from "../../state/upload/actions";
import { GoBackAction, NextPageAction } from "../../state/selection/types";
import { goBack, goForward } from "../../state/selection/actions";
import { alphaOrderComparator } from "../../util";
import FormPage from "../../components/FormPage";
import NoteIcon from "../../components/NoteIcon";
import { State } from "../../state/types";
import {
    InitiateUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    UpdateUploadAction,
    UploadJobTableRow
} from "../../state/upload/types";
import { AlertType, SetAlertAction } from "../../state/feedback/types";
import { setAlert } from "../../state/feedback/actions";

const styles = require("./style.pcss");

interface DragEnterCounts {
    [file: string]: number;
}

interface Props {
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    initiateUpload: ActionCreator<InitiateUploadAction>;
    jumpToUpload: ActionCreator<JumpToUploadAction>;
    setAlert: ActionCreator<SetAlertAction>;
    updateUpload: ActionCreator<UpdateUploadAction>;
    uploads: UploadJobTableRow[];
}

interface UploadJobState {
    // Keeps track of net number of drag events into each row.
    // Used to determine if the row is being hovered or not.
    // This is guaranteed to be 1 or greater when a file is hovered within the row.
    // Making this a boolean doesn't work because child elements will also fire
    // drag/drop events (and this can't be prevented).
    dragEnterCounts: DragEnterCounts;
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
        },
        {
            key: "notes",
            render: (text: string, record: UploadJobTableRow) => (
                <NoteIcon
                    notes={record.notes}
                    handleError={this.handleError}
                    saveNotes={this.saveNotesByRecord(record)}
                />
            ),
            title: "Notes",
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
            dragEnterCounts: {},
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
                formTitle="ADD ADDITIONAL DATA"
                formPrompt="Review and add information to the files below and click Upload to submit the job."
                onSave={this.upload}
                saveButtonName="Upload"
                onBack={this.props.goBack}
            >
                {this.renderButtons()}
                <Table
                    className={styles.tableRow}
                    columns={this.columns}
                    dataSource={uploads}
                    onRow={this.onRow}
                    rowSelection={this.rowSelection}
                />
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

    private onRow = (record: UploadJobTableRow): TableEventListeners => {
        const className = this.state.dragEnterCounts[record.file] && styles.rowHighlight;
        return {
            className,
            onDragEnter: (e: React.DragEvent<HTMLDivElement>) => this.onDragEnter(record, e),
            onDragLeave: (e: React.DragEvent<HTMLDivElement>) => this.onDragLeave(record, e),
            onDrop: (e: React.DragEvent<HTMLDivElement>) => this.onDrop(record, e),
        };
    }

    private onDrop = async (record: UploadJobTableRow, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const notes = await NoteIcon.onDrop(e.dataTransfer.files, this.handleError);
        this.saveNotes(record, notes);
        this.setState({ dragEnterCounts: {} });
    }

    private onDragEnter = (record: UploadJobTableRow, e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        this.setState({
            dragEnterCounts: {
                ...this.state.dragEnterCounts,
                [record.file]: (this.state.dragEnterCounts[record.file] || 0) + 1,
            },
        });
    }

    private onDragLeave = (record: UploadJobTableRow, e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        this.setState({
            dragEnterCounts: {
                ...this.state.dragEnterCounts,
                [record.file]: this.state.dragEnterCounts[record.file] - 1,
            },
        });
    }

    // Not allowing lambdas in JSX attributes resulted in this (perhaps there is a better way?)
    private saveNotesByRecord = (record: UploadJobTableRow): (notes: string | undefined) => void => {
        return (notes: string | undefined) => this.saveNotes(record, notes);
    }

    private saveNotes = (record: UploadJobTableRow, notes: string | undefined) => {
        this.props.updateUpload({ ...record, notes });
    }

    private handleError = (error: string) => {
        this.props.setAlert({
            message: error,
            type: AlertType.WARN,
        })
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
    setAlert,
    removeUploads,
    updateUpload,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadJob);
