import { Button } from "antd";
import * as classNames from "classnames";
import Logger from "js-logger";
import { get, isEmpty, without } from "lodash";
import { basename } from "path";
import * as React from "react";
import ReactDataGrid from "react-data-grid";
import { ActionCreator } from "redux";

import NoteIcon from "../../components/NoteIcon";
import { AlertType, SetAlertAction } from "../../state/feedback/types";
import { Channel } from "../../state/metadata/types";
import { ExpandedRows, ToggleExpandedUploadJobRowAction, Well } from "../../state/selection/types";
import {
    ColumnDefinition,
    ColumnType,
    RemoveSchemaFilepathAction,
    SchemaDefinition,
} from "../../state/setting/types";
import { getUploadRowKey } from "../../state/upload/constants";
import {
    RemoveUploadsAction,
    UpdateScenesAction,
    UpdateUploadAction, UpdateUploadsAction,
    UploadJobTableRow, UploadMetadata,
} from "../../state/upload/types";
import { getWellLabel, onDrop } from "../../util";
import BooleanFormatter from "../BooleanHandler/BooleanFormatter";
import FormControl from "../FormControl";
import Editor from "./Editor";
import FileFormatter from "./FileFormatter";
import WellsFormatter from "./WellsFormatter";

const styles = require("./style.pcss");

type SortableColumns = "barcode" | "file" | "wellLabels";
type SortDirections = "ASC" | "DESC" | "NONE";

interface Props {
    allWellsForSelectedPlate: Well[][];
    canUndo: boolean;
    canRedo: boolean;
    channels: Channel[];
    className?: string;
    expandedRows: ExpandedRows;
    fileToAnnotationHasValueMap: {[file: string]: {[key: string]: boolean}};
    redo: () => void;
    removeSchemaFilepath: ActionCreator<RemoveSchemaFilepathAction>;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    schemaFile?: string;
    schema?: SchemaDefinition;
    setAlert: ActionCreator<SetAlertAction>;
    toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
    undo: () => void;
    updateScenes: ActionCreator<UpdateScenesAction>;
    updateUpload: ActionCreator<UpdateUploadAction>;
    updateUploads: ActionCreator<UpdateUploadsAction>;
    uploads: UploadJobTableRow[];
}

interface CustomDataState {
    selectedRows: string[];
    sortColumn?: SortableColumns;
    sortDirection?: SortDirections;
}

interface UploadJobColumn extends AdazzleReactDataGrid.Column<UploadJobTableRow> {
    dropdownValues?: string[];
    type?: ColumnType;
}

interface OnExpandArgs {
    expandArgs: {
        canExpand: boolean;
        children: UploadJobTableRow[];
        expanded: boolean;
        field: string;
        treeDepth: number;
    };
    idx: number;
    rowData: UploadJobTableRow;
    rowIdx: number;
}

export interface FormatterProps {
    isScrollable?: boolean;
    row: UploadJobTableRow;
    value?: any;
}

class CustomDataGrid extends React.Component<Props, CustomDataState> {
    private readonly WELL_UPLOAD_COLUMNS: UploadJobColumn[] = [
        {
            formatter: ({ row, value }: FormatterProps) => (
                row.channel || !isEmpty(row.positionIndexes) ?
                    null :
                    this.renderFormat(
                        row,
                        "wellLabels",
                        value,
                        (
                            <WellsFormatter
                                fileName={basename(row.file)}
                                saveWells={this.saveWellsByRow(row)}
                                selectedWellIds={row.wellIds || []}
                                selectedWellLabels={row.wellLabels}
                                wells={this.props.allWellsForSelectedPlate}
                            />
                        ),
                        true
                    )
            ),
            key: "wellLabels",
            name: "Well(s)",
            resizable: true,
            sortable: true,
        },
    ];

    private readonly WORKFLOW_UPLOAD_COLUMNS: UploadJobColumn[] = [
        {
            formatter: ({ row, value }: FormatterProps) => this.renderFormat(row, "workflows", value),
            key: "workflows",
            name: "Workflow(s)",
            resizable: true,
        },
    ];

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedRows: [],
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
        const { selectedRows } = this.state;

        const sortedRows = this.sortRows(uploads, this.state.sortColumn, this.state.sortDirection);
        const rowGetter = (idx: number) => sortedRows[idx];

        return (
            <>
                <div className={styles.buttonRow}>
                    <div className={styles.deleteButton}>
                        <Button onClick={this.removeSelectedRows} disabled={isEmpty(selectedRows)}>
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
                        // @ts-ignore
                        // types do not include getSubRowDetails and onCellExpand yet
                        <ReactDataGrid
                            cellNavigationMode="changeRow"
                            columns={this.getColumns()}
                            enableCellSelect={true}
                            enableDragAndDrop={true}
                            getSubRowDetails={this.getSubRowDetails}
                            minHeight={550}
                            onGridRowsUpdated={this.updateRow}
                            onGridSort={this.determineSort}
                            rowGetter={rowGetter}
                            rowsCount={sortedRows.length}
                            rowSelection={{
                                enableShiftSelect: true,
                                onRowsDeselected: this.deselectRows,
                                onRowsSelected: this.selectRows,
                                selectBy: {
                                    keys: {
                                        rowKey: "key",
                                        values: selectedRows,
                                    },
                                },
                            }}
                            onCellExpand={this.onCellExpand}
                        />
                        :
                        <p className={styles.alignCenter}>No Uploads</p>
                    }
                </div>
            </>
        );
    }

    private renderFormat = (row: UploadJobTableRow,
                            label: string,
                            value: any,
                            childElement?: React.ReactNode | React.ReactNodeArray,
                            required?: boolean,
                            className?: string): React.ReactElement => {
        if (required && !this.props.fileToAnnotationHasValueMap[row.file][label]) {
            childElement = (
                <FormControl
                    className={classNames(styles.formatterContainer, className)}
                    error={`${label} is required, current value is: ${value}`}
                >
                    {childElement || value}
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
            formatter: ({ row, value }: FormatterProps) =>
                this.renderFormat(
                    row,
                    "file",
                    value,
                    (
                        <FileFormatter
                            addScenes={this.addScenes(row)}
                            channelOptions={this.props.channels}
                            row={row}
                            value={value}
                        />
                    )
                ),
            key: "file",
            name: "File",
            resizable: true,
            sortable: true,
            width: 250,
        },
        ...innerColumns,
        {
            editable: true,
            formatter: ({ row, value }: FormatterProps) => (
                this.renderFormat(
                    row,
                    "notes",
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
                    this.renderFormat(row, label, value, undefined, required)
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
        const rowKeys = rows.map((r) => r.row.key);
        this.setState({selectedRows:  [...this.state.selectedRows, ...rowKeys] });
    }

    private deselectRows = (rows: Array<{row: UploadJobTableRow, rowIdx: number}>) => {
        const rowKeys = rows.map((r) => r.row.key);
        const selectedRows = without(this.state.selectedRows, ...rowKeys);
        this.setState({selectedRows});
    }

    private updateRow = (e: AdazzleReactDataGrid.GridRowsUpdatedEvent<UploadJobTableRow>) => {
        const {fromRow,  toRow, updated } = e;
        // Updated is a {key:  value }
        if (updated) {
            for  (let i = fromRow; i <=  toRow; i++) {
                const { channel, file, positionIndex } = this.props.uploads[i];
                this.props.updateUpload(getUploadRowKey(file, positionIndex, get(channel, "channelId")), updated);
            }
        }
    }

    private removeSelectedRows = (): void => {
        this.props.removeUploads(this.state.selectedRows);
        this.setState({selectedRows:  [] });
    }

    private onDrop = ({channel, file, positionIndex}: UploadJobTableRow) => (
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const notes = await onDrop(e.dataTransfer.files, this.handleError);
            this.props.updateUpload(getUploadRowKey(file, positionIndex, get(channel, "channelId")), {notes});
        }
    )

    private saveNotesByRow = (row: UploadJobTableRow): (notes: string | undefined) => void => {
        return (notes: string | undefined) => this.saveByRow(notes, "notes", row);
    }

    private saveWellsByRow = (tableRow: UploadJobTableRow) => {
        return (wells: Well[]) => {
            const wellLabels: string[] = wells.map(({col, row}) => getWellLabel({col, row}));
            const wellIds = wells.map((w) => w.wellId);
            this.saveByRow(wellLabels, "wellLabels", tableRow);
            this.saveByRow(wellIds, "wellIds", tableRow);
        };
    }

    private saveByRow = (value: any, key: keyof UploadMetadata, {channel, file, positionIndex}: UploadJobTableRow) => {
        this.props.updateUpload(getUploadRowKey(file, positionIndex, get(channel, "channelId")), { [key]: value });
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

    private onCellExpand = (args: OnExpandArgs) => this.props.toggleRowExpanded(args.rowData.key);

    private getSubRowDetails = (rowItem: UploadJobTableRow) => {
        const { expandedRows } = this.props;
        return {
            ...rowItem,
            expanded: expandedRows[rowItem.key] || false,
            field: "file",
        };
    }

    private addScenes = (row: UploadJobTableRow) => (positionIndexes: number[], channels: Channel[]) => {
        this.props.updateScenes(row, positionIndexes, channels);
    }
}

export default CustomDataGrid;
