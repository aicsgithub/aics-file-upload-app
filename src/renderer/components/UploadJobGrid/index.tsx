import { Button } from "antd";
import * as classNames from "classnames";
import { without, isEmpty } from "lodash";
import Logger from "js-logger";
import { Moment } from "moment";
import * as React from "react";
import ReactDataGrid from "react-data-grid";
import { ActionCreator } from "redux";

import NoteIcon from "../../components/NoteIcon";
import { AlertType, SetAlertAction } from "../../state/feedback/types";
import {
    RemoveUploadsAction,
    SchemaFileOption,
    UpdateUploadAction,
    UploadJobTableRow,
} from "../../state/upload/types";
import {
    ColumnDefinition,
    ColumnType,
    RemoveSchemaFilepathAction,
    SchemaDefinition
} from "../../state/setting/types";
import Editor from "./Editor";

const styles = require("./style.pcss");

type SortableColumns = "barcode" | "file" | "wellLabels";
type SortDirections = "ASC" | "DESC" | "NONE";

interface Props {
    canUndo: boolean;
    canRedo: boolean;
    className?: string;
    redo: () => void;
    removeSchemaFilepath: ActionCreator<RemoveSchemaFilepathAction>;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    selectSchema: (option: SchemaFileOption | null) => void;
    schemaFile?: string;
    schemaFileOptions: SchemaFileOption[];
    schema?: SchemaDefinition;
    setAlert: ActionCreator<SetAlertAction>;
    undo: () => void;
    updateUpload: ActionCreator<UpdateUploadAction>;
    uploads: UploadJobTableRow[];
}

interface UploadJobState {
    selectedFiles: string[];
    sortColumn?: SortableColumns;
    sortDirection?: SortDirections;
}

interface FormatterProps {
    row: any;
    value: any;
}

class UploadJobGrid extends React.Component<Props, UploadJobState> {
    private readonly UPLOAD_JOB_COLUMNS: Array<AdazzleReactDataGrid.Column<UploadJobTableRow>> = [
        {
            formatter: ({ row, value }: any) => (
                this.renderFormat(
                    false,
                    row,
                    value)
            ),
            key: "file",
            name: "File",
            resizable: true,
            sortable: true,
        },
        {
            formatter: ({ row, value }: any) => (
                this.renderFormat(
                    false,
                    row,
                    value)
            ),
            key: "barcode",
            name: "Barcode",
            resizable: true,
            sortable: true,
            width: 135,
        },
        {
            formatter: ({ row, value }: any) => (
                this.renderFormat(
                    false,
                    row,
                    value)
            ),
            key: "wellLabels",
            name: "Well(s)",
            sortable: true,
        },
        {
            formatter: ({ row, value }: any) => (
                this.renderFormat(
                    false,
                    row,
                    value,
                    <NoteIcon
                        handleError={this.handleError}
                        notes={row.notes}
                        saveNotes={this.saveNotesByRow(row)}
                    />)
            ),
            key: "notes",
            name: "Notes",
            width: 80,
        },
    ];

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedFiles: [],
        };
    }

    public render() {
        const {
            className,
            canUndo,
            canRedo,
            redo,
            undo,
            uploads
        } = this.props;
        const { selectedFiles } = this.state;

        const sortedRows = this.sortRows(uploads, this.state.sortColumn, this.state.sortDirection);
        const rowGetter = (idx: number) => sortedRows[idx];
        // red border
        // icon
        // tooltip

        return (
            <>
                <div className={styles.buttonRow}>
                    <div className={styles.deleteButton}>
                        <Button onClick={this.removeSelectedRows} disabled={isEmpty(selectedFiles)}>
                            Remove Selected
                        </Button>
                    </div>
                    <div className={styles.undoRedoButtons}>
                        <Button className={styles.undoButton} onClick={undo} disabled={!canUndo}>Undo</Button>
                        <Button className={styles.redoButton} onClick={redo} disabled={!canRedo}>Redo</Button>
                    </div>
                </div>
                <div className={classNames(styles.dataGrid, className)}>
                    {sortedRows.length ?
                        <ReactDataGrid
                            cellNavigationMode="changeRow"
                            columns={this.getColumns()}
                            enableCellSelect={true}
                            enableDragAndDrop={true}
                            minHeight={550}
                            onGridRowsUpdated={this.updateRow}
                            onGridSort={this.determineSort}
                            rowGetter={rowGetter}
                            rowsCount={sortedRows.length}
                            rowSelection={{
                                enableCellAutoFocus: false,
                                enableShiftSelect: true,
                                onRowsDeselected: this.deselectRows,
                                onRowsSelected: this.selectRows,
                                selectBy: {
                                    keys: {
                                        rowKey: "file",
                                        values: selectedFiles,
                                    }
                                },
                            }}
                        />
                        :
                        <p className={styles.alignCenter}>No Uploads</p>
                    }
                </div>
            </>
        );
    }

    private removeSelectedRows = (): void => {
        this.props.removeUploads(this.state.selectedFiles);
        this.setState({ selectedFiles: [] });
    }

    private datePicker = (label: string, row: UploadJobTableRow) => {
        return (time: Moment) => this.props.updateUpload(row.file, { [label]: time });
    }

    // This method allows us to more consistently apply things to our cells like required classes and onDrop
    // Note: I cannot encompass the ({row, value}) => {} because we need the determineFormatter to tell us what to use
    // for the value or className
    private renderFormat = (required: boolean,
                         row: UploadJobTableRow,
                         value: any,
                         children?: React.ReactNode | React.ReactNodeArray,
                         className?: string): React.ReactElement => {
        const requiredStyle = required && value === null && styles.required;
        return (
            <div className={classNames(requiredStyle, className)} onDrop={this.onDrop(row)}>
                {children ? children : value}
            </div>
        );
    }

    private determineFormatter = (label: string,
                                  type: ColumnType,
                                  required: boolean): ((arg0: FormatterProps) => React.ReactElement) => {
        if (type === ColumnType.BOOLEAN) {
            return ({ row, value }: any) => (
                this.renderFormat(
                    required,
                    row,
                    value ? "Yes" : "No",
                    undefined,
                    value ? styles.true : styles.false)
            );
        // } else if (type === ColumnType.DATE) {
        //     return ({ row, value }: any) => (
        //         this.renderFormat(
        //             required,
        //             row,
        //             value,
        //             <DatePicker
        //                 onChange={this.datePicker(label, row)}
        //             />)
        //     );
        // } else if (type === ColumnType.DATETIME) {
        //     return ({ row, value }: any) => (
        //         this.renderFormat(
        //             required,
        //             row,
        //             value,
        //             <DatePicker
        //                 onChange={this.datePicker(label, row)}
        //                 showTime={true}
        //             />)
        //     );
        } else {
            return ({ row, value }: any) => (
                this.renderFormat(
                    required,
                    row,
                    value)
            );
        }
    }

    private getColumns = (): Array<AdazzleReactDataGrid.Column<UploadJobTableRow>> => {
        if (!this.props.schema) {
            return this.UPLOAD_JOB_COLUMNS;
        }
        const schemaColumns = this.props.schema.columns.map((column: ColumnDefinition) => {
            const { label, type: { type, dropdownValues }, required } = column;
            return {
                // cellClass TODO: Uses?
                dropdownValues,
                // Currently unable to support read and edit modes for dates, just using edit
                // editable: type !== ColumnType.DATE && type !== ColumnType.DATETIME,
                // We want the default editor for TEXT types
                editor: type === ColumnType.TEXT ? undefined : Editor,
                formatter: this.determineFormatter(label, type, required),
                key: label,
                name: label,
                resizable: true,
                type
            }
        });
        return this.UPLOAD_JOB_COLUMNS.concat(schemaColumns);
    }

    // This method currently only supports file, barcode, and wellLabels due to typescript constraints on allowing
    // indexing of objects with a key of type: string since TS7017: Element implicitly has an 'any' type because type
    // 'UploadJobTableRow' has no index signature. Can update this to include more columns or search inside an array
    // of "editableColumns"
    private determineSort = (sortColumn: string, sortDirection: SortDirections) => {
        if (sortColumn !== "barcode" && sortColumn !== "file" && sortColumn !== "wellLabels") {
            Logger.error(`Invalid column sort attempted with column: ${sortColumn}`);
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

    private selectRows = (rows: Array<{row: UploadJobTableRow, rowIdx: number}>) => {
        const files = rows.map((r) => r.row.file);
        this.setState({ selectedFiles: [...this.state.selectedFiles, ...files] });
    }

    private deselectRows = (rows: Array<{row: UploadJobTableRow, rowIdx: number}>) => {
        const files = rows.map((r) => r.row.file);
        const selectedFiles = without(this.state.selectedFiles, ...files);
        this.setState({ selectedFiles });
    }

    private updateRow = (e: AdazzleReactDataGrid.GridRowsUpdatedEvent<UploadJobTableRow>) => {
        const { fromRow, toRow, updated } = e;
        for (let i = fromRow; i <= toRow; i++) {
            this.props.updateUpload(this.props.uploads[i].file, updated)
        }
    }

    private onDrop = (row: UploadJobTableRow) => (
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const notes = await NoteIcon.onDrop(e.dataTransfer.files, this.handleError);
            this.props.updateUpload(row, { notes })
        }
    )

    private saveNotesByRow = (row: UploadJobTableRow): (notes: string | undefined) => void => {
        return (notes: string | undefined) => this.props.updateUpload(row.file, { notes });
    }

    private handleError = (error: string, errorFile?: string) => {
        if (errorFile) {
            this.props.removeSchemaFilepath(errorFile);
        }
        this.props.setAlert({
            message: error,
            type: AlertType.WARN,
        });
    }
}

export default UploadJobGrid;
