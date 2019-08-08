import { Button } from "antd";
import { isEmpty, without } from "lodash";
import * as React from "react";
import ReactDataGrid from "react-data-grid";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import NoteIcon from "../../components/NoteIcon";
import { setAlert } from "../../state/feedback/actions";
import { AlertType, SetAlertAction } from "../../state/feedback/types";
import { goBack, goForward } from "../../state/selection/actions";
import { GoBackAction, NextPageAction } from "../../state/selection/types";
import { State } from "../../state/types";
import { initiateUpload, jumpToUpload, removeUploads, updateUpload } from "../../state/upload/actions";
import { getCanRedoUpload, getCanUndoUpload, getUploadSummaryRows } from "../../state/upload/selectors";
import {
    InitiateUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    UpdateUploadAction,
    UploadJobTableRow
} from "../../state/upload/types";

const styles = require("./style.pcss");

type SortableColumns = "barcode" | "file" | "wellLabels";
type SortDirections = "ASC" | "DESC" | "NONE";

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
    selectedRows: number[];
    sortColumn?: SortableColumns;
    sortDirection?: SortDirections;
}

class UploadJob extends React.Component<Props, UploadJobState> {
    private UPLOAD_JOB_COLUMNS: Array<AdazzleReactDataGrid.Column<UploadJobTableRow>> = [
        {
            formatter: ({ row, value }: any) => (
                <div onDrop={this.onDrop(row)}>
                    {value}
                </div>
            ),
            key: "file",
            name: "File",
            resizable: true,
            sortable: true,
        },
        {
            formatter: ({ row, value }: any) => (
                <div onDrop={this.onDrop(row)}>
                    {value}
                </div>
            ),
            key: "barcode",
            name: "Barcode",
            resizable: true,
            sortable: true,
            width: 135,
        },
        {
            formatter: ({ row, value }: any) => (
                <div onDrop={this.onDrop(row)}>
                    {value}
                </div>
            ),
            key: "wellLabels",
            name: "Well(s)",
            sortable: true,
        },
        {
            formatter: ({ row }: any) => (
                <div onDrop={this.onDrop(row)}>
                    <NoteIcon
                        handleError={this.handleError}
                        notes={row.notes}
                        saveNotes={this.saveNotesByRow(row)}
                    />
                </div>
            ),
            key: "notes",
            name: "Notes",
            width: 80,
        },
    ];

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedRows: [],
        };
    }

    public render() {
        const { className, uploads} = this.props;
        const { selectedRows } = this.state;
        // Saving rows to the state seems to significantly complicate things due to actions like undo/redo while
        // having notes & sorted (or in the future edited/filtered) rows. At the moment, I went with this solution of
        // sorting on each render
        const sortedRows = this.sortRows(uploads, this.state.sortColumn, this.state.sortDirection);
        const rowGetter = (idx: number) => sortedRows[idx];

        return (
            <FormPage
                className={className}
                formTitle="ADD ADDITIONAL DATA"
                formPrompt="Review and add information to the files below and click Upload to submit the job."
                onSave={this.upload}
                saveButtonDisabled={!this.props.uploads.length}
                saveButtonName="Upload"
                onBack={this.props.goBack}
            >
                {this.renderButtons()}
                <div className={styles.dataGrid}>
                    {sortedRows.length ?
                        <ReactDataGrid
                            cellNavigationMode="changeRow"
                            columns={this.UPLOAD_JOB_COLUMNS}
                            enableCellSelect={true}
                            enableDragAndDrop={true}
                            onGridSort={this.determineSort}
                            rowGetter={rowGetter}
                            rowsCount={sortedRows.length}
                            rowSelection={{
                                enableShiftSelect: true,
                                onRowsDeselected: this.deselectRows,
                                onRowsSelected: this.selectRows,
                                selectBy: {
                                    indexes: selectedRows,
                                },
                            }}
                        />
                        :
                        <p style={{ textAlign: "center" }}>No Uploads</p>
                    }
                </div>
            </FormPage>
        );
    }

    // This method currently only supports file, barcode, and wellLabels due to typescript constraints on allowing
    // indexing of objects with a key of type: string since TS7017: Element implicitly has an 'any' type because type
    // 'UploadJobTableRow' has no index signature. Can update this to include more columns or search inside an array
    // of "editableColumns"
    private determineSort = (sortColumn: string, sortDirection: SortDirections) => {
        if (sortColumn !== "barcode" && sortColumn !== "file" && sortColumn !== "wellLabels") {
            this.handleError(`Invalid column sort attempted with column: ${sortColumn}`);
        } else {
            this.setState({ sortColumn, sortDirection });
        }
    }

    // This method converts the value at the key to string to allow this sort of generic comparison with localCompare
    private sortRows = (rows: UploadJobTableRow[],
                        sortColumn?: SortableColumns,
                        sortDirection?: SortDirections)
        : UploadJobTableRow[] => {
        if (sortColumn && sortDirection === "ASC") {
            return rows.sort((a: UploadJobTableRow, b: UploadJobTableRow) =>
                `${a[sortColumn]}`.localeCompare(`${b[sortColumn]}`)
            );
        }
        if (sortColumn && sortDirection === "DESC") {
            return rows.sort((a: UploadJobTableRow, b: UploadJobTableRow) =>
                `${b[sortColumn]}`.localeCompare(`${a[sortColumn]}`)
            );
        }
        return this.props.uploads;
    }

    private selectRows = (rows: Array<{rowIdx: number}>) => {
        const indexes = rows.map((r) => r.rowIdx);
        this.setState({ selectedRows: [...this.state.selectedRows, ...indexes] });
    }

    private deselectRows = (rows: Array<{rowIdx: number}>) => {
        const indexes = rows.map((r) => r.rowIdx);
        const selectedRows = without(this.state.selectedRows, ...indexes);
        this.setState({ selectedRows });
    }

    private renderButtons = () => {
        const { canRedo, canUndo } = this.props;
        const { selectedRows } = this.state;

        return (
            <div className={styles.buttonRow}>
                <div className={styles.deleteButton}>
                    <Button onClick={this.removeSelectedUploads} disabled={isEmpty(selectedRows)}>
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

    private removeSelectedUploads = (): void => {
        // Need the sorted rows to get the file at the right index
        const sortedRows = this.sortRows(this.props.uploads, this.state.sortColumn, this.state.sortDirection);
        const uploadsToRemove = this.state.selectedRows.map((rowIndex) => sortedRows[rowIndex].file);
        this.setState({ selectedRows: [] });
        this.props.removeUploads(uploadsToRemove);
    }

    private onDrop = (row: UploadJobTableRow) => (
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const notes = await NoteIcon.onDrop(e.dataTransfer.files, this.handleError);
            this.saveNotes(row, notes);
        }
    )

    // Not allowing lambdas in JSX attributes resulted in this (perhaps there is a better way?)
    private saveNotesByRow = (row: UploadJobTableRow): (notes: string | undefined) => void => {
        return (notes: string | undefined) => this.saveNotes(row, notes);
    }

    private saveNotes = (row: UploadJobTableRow, notes: string | undefined) => {
        this.props.updateUpload({ ...row, notes });
    }

    private handleError = (error: string) => {
        this.props.setAlert({
            message: error,
            type: AlertType.WARN,
        });
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
    setAlert,
    updateUpload,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadJob);
