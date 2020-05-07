import { Button } from "antd";
import * as classNames from "classnames";
import { MenuItem, MenuItemConstructorOptions } from "electron";
import Logger from "js-logger";
import { castArray, includes, isEmpty, isNil, without } from "lodash";
import * as moment from "moment";
import * as React from "react";
import ReactDataGrid from "react-data-grid";
import { ActionCreator } from "redux";

import NoteIcon from "../../components/NoteIcon";
import { DATE_FORMAT, DATETIME_FORMAT, LIST_DELIMITER_JOIN } from "../../constants";
import { AlertType, SetAlertAction } from "../../state/feedback/types";
import { Channel } from "../../state/metadata/types";
import {
    ExpandedRows,
    ToggleExpandedUploadJobRowAction,
    Well,
} from "../../state/selection/types";
import { AnnotationType, ColumnType, Template, TemplateAnnotation } from "../../state/template/types";
import { getUploadRowKey, getUploadRowKeyFromUploadTableRow } from "../../state/upload/constants";
import {
    RemoveUploadsAction,
    UpdateSubImagesAction,
    UpdateUploadAction,
    UploadJobTableRow,
    UploadMetadata,
} from "../../state/upload/types";
import { onDrop } from "../../util";

import BooleanFormatter from "../BooleanFormatter";
import AddValuesModal from "./AddValuesModal";

import CellWithContextMenu from "./CellWithContextMenu";
import Editor from "./Editor";
import FileFormatter from "./FileFormatter";
import WellsEditor from "./WellsEditor";

const styles = require("./style.pcss");

const SPECIAL_CASES_FOR_MULTIPLE_VALUES = [ColumnType.DATE, ColumnType.DATETIME];
type SortableColumns = "barcode" | "file" | "wellLabels";
type SortDirections = "ASC" | "DESC" | "NONE";

interface Props {
    allWellsForSelectedPlate: Well[][];
    annotationTypes: AnnotationType[];
    canUndo: boolean;
    canRedo: boolean;
    channels: Channel[];
    className?: string;
    expandedRows: ExpandedRows;
    fileToAnnotationHasValueMap: {[file: string]: {[key: string]: boolean}};
    redo: () => void;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    template?: Template;
    setAlert: ActionCreator<SetAlertAction>;
    toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
    undo: () => void;
    updateSubImages: ActionCreator<UpdateSubImagesAction>;
    updateUpload: ActionCreator<UpdateUploadAction>;
    uploads: UploadJobTableRow[];
    validationErrors: {[key: string]: {[annotationName: string]: string}};
}

interface CustomDataState {
    addValuesRow?: UploadJobTableRow;
    selectedRows: string[];
    sortColumn?: SortableColumns;
    sortDirection?: SortDirections;
}

interface UploadJobColumn extends AdazzleReactDataGrid.Column<UploadJobTableRow> {
    allowMultipleValues?: boolean;
    dropdownValues?: string[];
    onChange?: (value: any, key: keyof UploadJobTableRow, row: UploadJobTableRow) => void;
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

export interface FormatterProps<T> {
    isScrollable?: boolean;
    row: T;
    value?: any;
}

class CustomDataGrid extends React.Component<Props, CustomDataState> {
    private get wellUploadColumns(): UploadJobColumn[] {
        return [
            {
                editor: WellsEditor,
                formatter: ({ row, value }: FormatterProps<UploadJobTableRow>) => {
                    if (row.channel ||
                        (!isEmpty(row.positionIndexes) || !isEmpty(row.scenes) || !isEmpty(row.subImageNames))) {
                        return <div className={styles.disabledCell}/>;
                    }
                    return (
                        !isEmpty(row.positionIndexes) ?
                            null :
                            this.renderFormat(
                                row,
                                "wellLabels",
                                value,
                                <div className={styles.labels}>{row.wellLabels}</div>,
                                    true
                            )
                    );
                },
                key: "wellLabels",
                name: "Wells",
                resizable: true,
                sortable: true,
            },
        ];
    }

    private readonly WORKFLOW_UPLOAD_COLUMNS: UploadJobColumn[] = [
        {
            formatter: ({ row, value }: FormatterProps<UploadJobTableRow>) =>
                this.renderFormat(row, "workflows", value),
            key: "workflows",
            name: "Workflows",
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
        const {
            selectedRows,
        } = this.state;

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
                            className?: string,
                            contextMenuItems?: Array<MenuItemConstructorOptions | MenuItem>): React.ReactElement => {
        // If a required field is not filled out, show error for that first.
        // If filled out but there is additional issues like misformatted lists (e.g. "a, b, c,")
        // then show a error related to that.
        const { validationErrors } = this.props;
        const showFieldIsRequiredError = required && !this.props.fileToAnnotationHasValueMap[row.file][label];
        let error;
        if (showFieldIsRequiredError) {
            error = `${label} is required`;
        } else if (validationErrors[row.key] && validationErrors[row.key][label]) {
            error = validationErrors[row.key][label];
        }

        let inner = childElement;
        if (!inner) {
            // this should always be true
            if (Array.isArray(value)) {
                inner = value.join(LIST_DELIMITER_JOIN);
            } else {
                inner = value;
            }
        }

        return (
            <CellWithContextMenu
                className={classNames(styles.formatterContainer, className)}
                error={error}
                template={contextMenuItems}
            >
                {inner}
            </CellWithContextMenu>
        );
    }

    private uploadColumns = (innerColumns: UploadJobColumn[]): UploadJobColumn[] => {
        const files = this.props.uploads.map(({ file }) => file);
        return [
            {
                formatter: ({ row, value }: FormatterProps<UploadJobTableRow>) =>
                    this.renderFormat(
                        row,
                        "file",
                        value,
                        (
                            <FileFormatter
                                addScenes={this.addScenes}
                                channelOptions={this.props.channels}
                                fileOptions={files}
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
                formatter: ({ row }: FormatterProps<UploadJobTableRow>) => (
                    <div className={styles.formatterContainer} onDrop={this.onDrop(row)}>
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
    }

    private getColumns = (): UploadJobColumn[] => {
        if (!this.props.uploads.length) {
            return [];
        }
        let basicColumns;
        if (this.props.uploads[0].barcode) {
            basicColumns = this.uploadColumns(this.wellUploadColumns);
        } else {
            basicColumns = this.uploadColumns(this.WORKFLOW_UPLOAD_COLUMNS);
        }
        if  (!this.props.template) {
            return basicColumns;
        }
        const schemaColumns = this.props.template.annotations.map((templateAnnotation: TemplateAnnotation) => {
            const {name,  annotationTypeId,  annotationOptions, required } = templateAnnotation;
            const annotationType = this.props.annotationTypes.find((a) => a.annotationTypeId === annotationTypeId);
            if (!annotationType) {
                throw new Error(
                    `Could not get annotation type for annotation ${templateAnnotation.name}. Contact Software`
                );
            }

            const type = annotationType.name;
            // When an annotation can have multiple values and it is a Date or Datetime, we need more space.
            const formatterNeedsModal = includes(SPECIAL_CASES_FOR_MULTIPLE_VALUES, type);
            const column: UploadJobColumn = {
                cellClass:  styles.formatterContainer,
                dropdownValues: annotationOptions,
                editable: !formatterNeedsModal,
                key: name,
                name,
                onChange: this.saveByRow,
                resizable: true,
                type,
            };

            if (!formatterNeedsModal) {
                column.editor = Editor;
            }
            // The date selectors need a certain width to function, this helps the grid start off in an initially
            // acceptable width for them
            if (type === ColumnType.DATE) {
                column.width = 170;
            } else if (type === ColumnType.DATETIME) {
                column.width = 250;
            }

            if (type === ColumnType.BOOLEAN) {
                column.formatter = (props) =>
                    BooleanFormatter({...props, rowKey: name, saveValue: this.saveByRow});
            } else {
                column.formatter = ({ row, value }: FormatterProps<UploadJobTableRow>) => {
                    let childEl;
                    if (formatterNeedsModal) {
                        childEl = (
                            <AddValuesModal
                                annotationName={templateAnnotation.name}
                                annotationType={type}
                                key={row.key + value}
                                onOk={this.saveByRow}
                                row={row}
                                values={value}
                            />
                        );
                    } else {
                        childEl = castArray(value)
                            .map((v: any) => {
                                switch (type) {
                                    case ColumnType.DATETIME:
                                        return moment(v).format(DATETIME_FORMAT);
                                    case ColumnType.DATE:
                                        return moment(v).format(DATE_FORMAT);
                                    default:
                                        return v;
                                }
                            })
                            .join(LIST_DELIMITER_JOIN);
                    }

                    return this.renderFormat(row, name, value, childEl, required);
                };
            }
            return column;
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
                this.props.updateUpload(
                    getUploadRowKeyFromUploadTableRow(this.props.uploads[i]), updated
                );
            }
        }
    }

    private removeSelectedRows = (): void => {
        this.props.removeUploads(this.state.selectedRows);
        this.setState({selectedRows:  [] });
    }

    private onDrop = (row: UploadJobTableRow) => (
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const notes = await onDrop(e.dataTransfer.files, this.handleError);
            this.props.updateUpload(getUploadRowKeyFromUploadTableRow(row), {notes});
        }
    )

    private saveNotesByRow = (row: UploadJobTableRow): (notes: string | undefined) => void => {
        return (notes: string | undefined) => this.saveByRow(notes, "notes", row);
    }

    private saveByRow = (value: any, key: keyof UploadMetadata, row: UploadJobTableRow) => {
        const values = !isNil(value) ? castArray(value) : [];
        this.props.updateUpload(getUploadRowKeyFromUploadTableRow(row), { [key]: values });
    }

    private handleError = (error: string) => {
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

    private addScenes = (
        files: string[],
        positionIndexes: number[],
        channels: Channel[],
        scenes: number[],
        subImageNames: string[]
    ) => {
        files.forEach((file: string) => {
            const row = this.props.uploads.find((upload) => upload.key === getUploadRowKey({file}));
            this.props.updateSubImages(row, {positionIndexes, channels, scenes, subImageNames});
        });
    }
}

export default CustomDataGrid;
