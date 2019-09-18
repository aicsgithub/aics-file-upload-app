import { Button } from "antd";
import * as classNames from "classnames";
import Logger from "js-logger";
import { isEmpty, isNil, without } from "lodash";
import * as React from "react";
import ReactDataGrid from "react-data-grid";
import { ActionCreator } from "redux";

import NoteIcon from "../../components/NoteIcon";
import { AlertType, SetAlertAction } from "../../state/feedback/types";
import {
    ColumnDefinition,
    ColumnType,
    RemoveSchemaFilepathAction,
    SchemaDefinition
} from "../../state/setting/types";
import { RemoveUploadsAction, UpdateUploadAction, UploadJobTableRow } from "../../state/upload/types";
import { onDrop } from "../../util";
import BooleanFormatter from "../BooleanHandler/BooleanFormatter";
import FormControl from "../FormControl";
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
    schemaFile?: string;
    schema?: SchemaDefinition;
    setAlert: ActionCreator<SetAlertAction>;
    undo: () => void;
    updateUpload: ActionCreator<UpdateUploadAction>;
    uploads: UploadJobTableRow[];
}

interface CustomDataState {
    selectedFiles: string[];
    sortColumn?: SortableColumns;
    sortDirection?: SortDirections;
}

interface UploadJobColumn extends AdazzleReactDataGrid.Column<UploadJobTableRow> {
    dropdownValues?: string[];
    type?: ColumnType;
}

interface FormatterProps {
    isScrollable?: boolean;
    row: any;
    value?: any;
}

class CustomDataGrid extends React.Component<Props, CustomDataState> {
    private readonly WELL_UPLOAD_COLUMNS: UploadJobColumn[] = [
        {
            formatter: ({ row, value }: FormatterProps) => this.renderFormat(row, value),
            key: "barcode",
            name: "Barcode",
            resizable: true,
            sortable: true,
            width: 135,
        },
        {
            formatter: ({ row, value }: FormatterProps) => this.renderFormat(row, value),
            key: "wellLabels",
            name: "Well(s)",
            resizable: true,
            sortable: true,
        },
    ];

    private readonly WORKFLOW_UPLOAD_COLUMNS: UploadJobColumn[] = [
        {
            formatter: ({ row, value }: FormatterProps) => this.renderFormat(row, value),
            key: "workflows",
            name: "Workflow(s)",
            resizable: true,
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
            uploads,
        } = this.props;
        const { selectedFiles } = this.state;

        const sortedRows = this.sortRows(uploads, this.state.sortColumn, this.state.sortDirection);
        const rowGetter = (idx: number) => sortedRows[idx];

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
                                    },
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

    private renderFormat = (row: UploadJobTableRow,
                            value: any,
                            children?: React.ReactNode | React.ReactNodeArray,
                            required?: boolean,
                            label?: string,
                            className?: string): React.ReactElement => {
        let childElement = children;
        if (required && isNil(value)) {
            childElement = (
                <FormControl
                    className={classNames(styles.formatterContainer, className)}
                    error={`${label} is required, current value is: ${value}`}
                >
                    {children}
                </FormControl>
            );
        }
        return (
            <div className={classNames(styles.formatterContainer, className)} onDrop={this.onDrop(row)}>
                {childElement ? childElement : value}
            </div>
        );
    }

    private uploadColumns = (innerColumns: UploadJobColumn[]): UploadJobColumn[] => ([
        {
            formatter: ({ row, value }: FormatterProps) => this.renderFormat(row, value),
            key: "file",
            name: "File",
            resizable: true,
            sortable: true,
        },
        ...innerColumns,
        {
            editable: true,
            formatter: ({ row, value }: FormatterProps) => (
                this.renderFormat(
                    row,
                    value,
                    (
                        <NoteIcon
                            handleError={this.handleError}
                            notes={row.notes}
                            saveNotes={this.saveNotesByRow(row)}
                        />
                    ))
            ),
            key: "notes",
            name: "Notes",
            width: 80,
        },
    ])

    private getColumns = (): UploadJobColumn[] => {
        if (!this.props.uploads.length) {
            return [];
        }
        let basicColumns;
        if (this.props.uploads[0].barcode) {
            basicColumns = this.uploadColumns(this.WELL_UPLOAD_COLUMNS);
        } else {
            basicColumns = this.uploadColumns(this.WORKFLOW_UPLOAD_COLUMNS);
        }
        if  (!this.props.schema) {
            return basicColumns;
        }
        const schemaColumns = this.props.schema.columns.map((column: ColumnDefinition) => {
            const {label,  type: {type,  dropdownValues }, required } = column;
            const columns: UploadJobColumn = {
                cellClass:  styles.formatterContainer,
                dropdownValues,
                editable: true,
                key: label,
                name: label,
                resizable: true,
                type,
            };
            // Use custom editor for everything except TEXT types which will use the default editor
            if (type !== ColumnType.TEXT) {
                columns.editor = Editor;
            }
            // The date selectors need a certain width to function, this helps the grid start off in an initially
            // acceptable width for them
            if (type === ColumnType.DATE) {
                columns.width = 170;
            } else if (type === ColumnType.DATETIME) {
                columns.width = 250;
            }
            if (type === ColumnType.BOOLEAN) {
                columns.formatter = (props) => BooleanFormatter({...props, rowKey: label, saveValue: this.saveByRow});
            } else {
                columns.formatter = ({ row, value }: FormatterProps) => (
                    this.renderFormat(row, value, undefined, required, label)
                );
            }
            return columns;
        });
        return basicColumns.concat(schemaColumns);
    }

    // This method currently only supports file, barcode, and wellLabels due to typescript constraints on allowing
    // indexing of objects with a key of type: string since TS7017: Element implicitly has an 'any' type because type
    // 'UploadJobTableRow' has no index signature. Can update this to include more columns or search inside an array
    // of "editableColumns"
    private determineSort = (sortColumn: string, sortDirection: SortDirections) => {
        if  (sortColumn !== "barcode" && sortColumn !== "file" && sortColumn !== "wellLabels") {
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
        if  (sortColumn && sortDirection === "ASC") {
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
        this.setState({selectedFiles:  [...this.state.selectedFiles, ...files] });
    }

    private deselectRows = (rows: Array<{row: UploadJobTableRow, rowIdx: number}>) => {
        const files = rows.map((r) => r.row.file);
        const selectedFiles = without(this.state.selectedFiles, ...files);
        this.setState({selectedFiles});
    }

    private updateRow = (e: AdazzleReactDataGrid.GridRowsUpdatedEvent<UploadJobTableRow>) => {
        const {fromRow,  toRow, updated } = e;
        // Updated is a {key:  value }
        if (updated) {
            for  (let i = fromRow; i <=  toRow; i++) {
                this.props.updateUpload(this.props.uploads[i].file, updated);
            }
        }
    }

    private removeSelectedRows = (): void => {
        this.props.removeUploads(this.state.selectedFiles);
        this.setState({selectedFiles:  [] });
    }

    private onDrop = (row: UploadJobTableRow) => (
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const notes = await onDrop(e.dataTransfer.files, this.handleError);
            this.props.updateUpload(row.file, {notes});
        }
    )

    private saveNotesByRow = (row: UploadJobTableRow): (notes: string | undefined) => void => {
        return (notes: string | undefined) => this.saveByRow(notes, "notes", row);
    }

    private saveByRow = (value: any, key: string, row: UploadJobTableRow) => {
        this.props.updateUpload(row.file, { [key]: value });
    }

    private handleError = (error: string, errorFile?: string) => {
        if  (errorFile) {
            this.props.removeSchemaFilepath(errorFile);
        }
        this.props.setAlert({
            message:  error,
            type: AlertType.WARN,
        });
    }
}

export default CustomDataGrid;
