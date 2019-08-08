import { Button } from "antd";
import { isEmpty } from "lodash";
import * as React from "react";
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
import ReactDataGrid from "react-data-grid";
import { without } from 'lodash';
// TODO: Fix ordering of imports and spacing

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
    selectedRows: number[];
    sortColumn?: 'barcode' | 'file' | 'wellLabels';
    sortDirection?: 'ASC' | 'DESC' | 'NONE'
}

// TODO: Drag n drop highlighting on row
// TODO: Do some text wrapping
class UploadJob extends React.Component<Props, UploadJobState> {
    // Necessary to allow drag and dropping on row rather than just the NoteIcon
    private dragAndDropFormatter = ({ row, value }: any) => (
        <div
            className={this.state.dragEnterCounts[row.file] && styles.rowHighlight}
            // onDragEnter={(e: React.DragEvent<HTMLDivElement>) => this.onDragEnter(row, e)}
            // onDragLeave={(e: React.DragEvent<HTMLDivElement>) => this.onDragLeave(row, e)}
            // onDrop={(e: React.DragEvent<HTMLDivElement>) => this.onDrop(row, e)}
        >
            {value}
        </div>
    );

    private UPLOAD_JOB_COLUMNS: Array<AdazzleReactDataGrid.Column<UploadJobTableRow>> = [
        {
            formatter: this.dragAndDropFormatter,
            key: "file",
            name: "File",
            resizable: true,
            sortable: true,
        },
        {
            formatter: this.dragAndDropFormatter,
            key: "barcode",
            name: "Barcode",
            resizable: true,
            sortable: true,
            width: 135,
        },
        {
            formatter: this.dragAndDropFormatter,
            key: "wellLabels",
            name: "Well(s)",
        },
        {
            formatter: ({ row }: any) => (
                <div
                    onDragEnter={(e: React.DragEvent<HTMLDivElement>) => this.onDragEnter(row, e)}
                    onDragLeave={(e: React.DragEvent<HTMLDivElement>) => this.onDragLeave(row, e)}
                    onDrop={(e: React.DragEvent<HTMLDivElement>) => this.onDrop(row, e)}
                >
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
            dragEnterCounts: {},
            selectedRows: [],
        };
    }

    public render() {
        const { className, uploads,} = this.props;
        const { selectedRows } = this.state;
        // Saving rows to the state seems to significantly complicate things due to actions like undo/redo while
        // having notes & sorted (or in the future edited/filtered) rows. At the moment, I went with this solution of
        // sorting on each render
        const sortedRows = this.sortRows(uploads, this.state.sortColumn, this.state.sortDirection);
        const rowsWithClassName = sortedRows.map((row: UploadJobTableRow) => ({ ...row, className: styles.rowHighlight}));
        const rowGetter = (idx: number) => rowsWithClassName[idx];

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
                <div className={styles.gridAndNotes}>
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
    private determineSort = (sortColumn: string, sortDirection: 'ASC' | 'DESC' | 'NONE') => {
        if (sortColumn !== 'barcode' && sortColumn !== 'file' && sortColumn !== 'wellLabels') {
            this.handleError(`Invalid column sort attempted with column: ${sortColumn}`)
        } else {
            this.setState({ sortColumn, sortDirection });
        }
    }

    // This method converts the value at the key to string to allow this sort of generic comparison with localCompare
    private sortRows = (rows: UploadJobTableRow[], sortColumn?: 'barcode' | 'file' | 'wellLabels', sortDirection?: 'ASC' | 'DESC' | 'NONE'): UploadJobTableRow[] => {
        if (sortColumn && sortDirection === 'ASC') {
            return rows.sort((a: UploadJobTableRow, b: UploadJobTableRow) => `${a[sortColumn]}`.localeCompare(`${b[sortColumn]}`));
        }
        if (sortColumn && sortDirection === 'DESC') {
            return rows.sort((a: UploadJobTableRow, b: UploadJobTableRow) => `${b[sortColumn]}`.localeCompare(`${a[sortColumn]}`));
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
        const {
            canRedo,
            canUndo,
        } = this.props;
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
        const uploadsToRemove = this.state.selectedRows.map(rowIndex => sortedRows[rowIndex].file);
        this.setState({ selectedRows: [] });
        this.props.removeUploads(uploadsToRemove);
    }

    private onDrop = async (row: UploadJobTableRow, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const notes = await NoteIcon.onDrop(e.dataTransfer.files, this.handleError);
        this.saveNotes(row, notes);
        this.setState({ dragEnterCounts: {} });
    }

    private onDragEnter = (row: UploadJobTableRow, e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        this.setState({
            dragEnterCounts: {
                ...this.state.dragEnterCounts,
                [row.file]: (this.state.dragEnterCounts[row.file] || 0) + 1,
            },
        });
    }

    private onDragLeave = (row: UploadJobTableRow, e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        this.setState({
            dragEnterCounts: {
                ...this.state.dragEnterCounts,
                [row.file]: this.state.dragEnterCounts[row.file] - 1,
            },
        });
    }

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
