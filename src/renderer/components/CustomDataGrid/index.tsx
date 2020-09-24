import { Button, Tooltip } from "antd";
import * as classNames from "classnames";
import { MenuItem, MenuItemConstructorOptions } from "electron";
import Logger from "js-logger";
import { castArray, includes, isEmpty, isNil, without } from "lodash";
import * as moment from "moment";
import * as React from "react";
import ReactDataGrid from "react-data-grid";
import { ActionCreator } from "redux";

import NoteIcon from "../../components/NoteIcon";
import {
  DATE_FORMAT,
  DATETIME_FORMAT,
  LIST_DELIMITER_JOIN,
  NOTES_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
  MAIN_FONT_WIDTH,
} from "../../constants";
import {
  AnnotationType,
  Channel,
  ColumnType,
} from "../../services/labkey-client/types";
import { Template, TemplateAnnotation } from "../../services/mms-client/types";
import { SetAlertAction } from "../../state/feedback/types";
import {
  ToggleExpandedUploadJobRowAction,
  Well,
} from "../../state/selection/types";
import { AlertType, ExpandedRows, UploadMetadata } from "../../state/types";
import {
  getUploadRowKey,
  getUploadRowKeyFromUploadTableRow,
} from "../../state/upload/constants";
import {
  RemoveUploadsAction,
  UpdateSubImagesAction,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UploadJobTableRow,
} from "../../state/upload/types";
import { convertToArray, getTextWidth, onDrop } from "../../util";
import BooleanFormatter from "../BooleanFormatter";

import CellWithContextMenu from "./CellWithContextMenu";
import DatesEditor from "./DatesEditor";
import Editor from "./Editor";
import FileFormatter from "./FileFormatter";
import { FormatterProps } from "./types";
import WellsEditor from "./WellsEditor";

const styles = require("./style.pcss");

const SPECIAL_CASES_FOR_MULTIPLE_VALUES = [
  ColumnType.DATE,
  ColumnType.DATETIME,
];
const DEFAULT_COLUMN_WIDTH = 170;
const GRID_ROW_HEIGHT = 35;
const GRID_BOTTOM_PADDING = 60;
type SortableColumns = "file" | "wellLabels";
type SortDirections = "ASC" | "DESC" | "NONE";

interface Props {
  allWellsForSelectedPlate: Well[][];
  annotationTypes: AnnotationType[];
  associateByWorkflow: boolean;
  canUndo: boolean;
  canRedo: boolean;
  channels: Channel[];
  className?: string;
  editable: boolean;
  expandedRows: ExpandedRows;
  fileToAnnotationHasValueMap: { [file: string]: { [key: string]: boolean } };
  redo: () => void;
  removeUploads: ActionCreator<RemoveUploadsAction>;
  template?: Template;
  setAlert: ActionCreator<SetAlertAction>;
  toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
  undo: () => void;
  updateSubImages: ActionCreator<UpdateSubImagesAction>;
  updateUpload: ActionCreator<UpdateUploadAction>;
  updateUploadRows: ActionCreator<UpdateUploadRowsAction>;
  uploads: UploadJobTableRow[];
  validationErrors: { [key: string]: { [annotationName: string]: string } };
}

interface CustomDataState {
  addValuesRow?: UploadJobTableRow;
  selectedRows: string[];
  sortColumn?: SortableColumns;
  sortDirection?: SortDirections;
}

interface UploadJobColumn
  extends AdazzleReactDataGrid.Column<UploadJobTableRow> {
  allowMultipleValues?: boolean;
  dropdownValues?: string[];
  onChange?: (
    value: any,
    key: keyof UploadJobTableRow,
    row: UploadJobTableRow
  ) => void;
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

class CustomDataGrid extends React.Component<Props, CustomDataState> {
  private get wellUploadColumns(): UploadJobColumn[] {
    return [
      {
        editable: this.props.editable,
        ...(this.props.editable ? { editor: WellsEditor } : {}),
        formatter: ({ row, value }: FormatterProps<UploadJobTableRow>) => {
          if (
            row.channelId ||
            !isEmpty(row.positionIndexes) ||
            !isEmpty(row.scenes) ||
            !isEmpty(row.subImageNames)
          ) {
            return <div className={styles.disabledCell} />;
          }
          return !isEmpty(row.positionIndexes)
            ? null
            : this.renderFormat(row, "wellLabels", value, undefined, true);
        },
        key: "wellLabels",
        name: "Wells",
        resizable: true,
        sortable: true,
        width: DEFAULT_COLUMN_WIDTH,
      },
    ];
  }

  private get workflowUploadColumns(): UploadJobColumn[] {
    return [
      {
        cellClass: styles.formatterContainer,
        editable: this.props.editable,
        ...(this.props.editable ? { editor: Editor } : {}),
        formatter: ({ row, value }: FormatterProps<UploadJobTableRow>) =>
          this.renderFormat(row, WORKFLOW_ANNOTATION_NAME, value),
        key: WORKFLOW_ANNOTATION_NAME,
        name: WORKFLOW_ANNOTATION_NAME,
        resizable: true,
        width: DEFAULT_COLUMN_WIDTH,
        type: ColumnType.LOOKUP,
      },
    ];
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRows: [],
    };
  }

  public render() {
    const { className, canUndo, canRedo, redo, undo, uploads } = this.props;
    const { selectedRows } = this.state;

    const sortedRows = this.sortRows(
      uploads,
      this.state.sortColumn,
      this.state.sortDirection
    );
    const rowGetter = (idx: number) => sortedRows[idx];

    return (
      <>
        <div className={styles.buttonRow}>
          <Tooltip title="Undo" mouseLeaveDelay={0}>
            <Button
              className={styles.undoButton}
              onClick={undo}
              disabled={!canUndo}
              icon="undo"
              type="link"
            />
          </Tooltip>
          <Tooltip title="Redo" mouseLeaveDelay={0}>
            <Button
              className={styles.redoButton}
              onClick={redo}
              disabled={!canRedo}
              icon="redo"
              type="link"
            />
          </Tooltip>
          <Tooltip title="Delete Selected Row" mouseLeaveDelay={0}>
            <Button
              onClick={this.removeSelectedRows}
              disabled={isEmpty(selectedRows)}
              icon="delete"
              type="link"
            />
          </Tooltip>
        </div>
        <div className={classNames(styles.dataGrid, className)}>
          {sortedRows.length ? (
            <ReactDataGrid
              cellNavigationMode="changeRow"
              columns={this.getColumns()}
              enableCellSelect={true}
              enableDragAndDrop={true}
              getSubRowDetails={this.getSubRowDetails}
              minHeight={
                sortedRows.length * GRID_ROW_HEIGHT + GRID_BOTTOM_PADDING
              }
              onGridRowsUpdated={(e) => this.updateRows(e, sortedRows)}
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
          ) : (
            <p className={styles.alignCenter}>No Uploads</p>
          )}
        </div>
      </>
    );
  }

  private renderFormat = (
    row: UploadJobTableRow,
    label: string,
    value: any = [],
    childElement?: React.ReactNode | React.ReactNodeArray,
    required?: boolean,
    className?: string,
    contextMenuItems?: Array<MenuItemConstructorOptions | MenuItem>
  ): React.ReactElement => {
    value = convertToArray(value);
    // If a required field is not filled out, show error for that first.
    // If filled out but there is additional issues like misformatted lists (e.g. "a, b, c,")
    // then show a error related to that.
    const { validationErrors } = this.props;
    const showFieldIsRequiredError =
      required && !this.props.fileToAnnotationHasValueMap[row.file][label];
    let error;
    if (showFieldIsRequiredError) {
      error = `${label} is required`;
    } else if (validationErrors[row.key] && validationErrors[row.key][label]) {
      error = validationErrors[row.key][label];
    }

    return (
      <CellWithContextMenu
        className={classNames(styles.formatterContainer, className)}
        error={error}
        template={contextMenuItems}
      >
        <Tooltip mouseLeaveDelay={0} title={value.join(LIST_DELIMITER_JOIN)}>
          {childElement || (
            <div className={styles.cell}>{value.join(LIST_DELIMITER_JOIN)}</div>
          )}
        </Tooltip>
      </CellWithContextMenu>
    );
  };

  private uploadColumns = (
    innerColumns: UploadJobColumn[]
  ): UploadJobColumn[] => {
    const files = this.props.uploads.map(({ file }) => file);
    return [
      {
        formatter: ({ row, value }: FormatterProps<UploadJobTableRow>) =>
          this.renderFormat(
            row,
            "file",
            value,
            <FileFormatter
              addScenes={this.addScenes}
              channelOptions={this.props.channels}
              fileOptions={files}
              key={row.key}
              row={row}
              value={value}
            />
          ),
        key: "file",
        name: "File",
        resizable: true,
        sortable: true,
        width: 250,
      },
      ...innerColumns,
      {
        formatter: ({ row }: FormatterProps<UploadJobTableRow>) => (
          <div
            className={classNames(
              styles.formatterContainer,
              styles.noteIconContainer
            )}
            onDrop={this.onDrop(row)}
          >
            <NoteIcon
              handleError={this.handleError}
              notes={row[NOTES_ANNOTATION_NAME]}
              saveNotes={this.saveNotesByRow(row)}
            />
          </div>
        ),
        key: NOTES_ANNOTATION_NAME,
        name: NOTES_ANNOTATION_NAME,
        width: 80,
      },
    ];
  };

  private getColumns = (): UploadJobColumn[] => {
    if (!this.props.uploads.length) {
      return [];
    }
    let basicColumns;
    if (!this.props.associateByWorkflow) {
      basicColumns = this.uploadColumns(this.wellUploadColumns);
    } else {
      basicColumns = this.uploadColumns(this.workflowUploadColumns);
    }
    if (!this.props.template) {
      return basicColumns;
    }
    const schemaColumns = this.props.template.annotations.map(
      (templateAnnotation: TemplateAnnotation) => {
        const {
          name,
          annotationTypeId,
          annotationOptions,
          required,
        } = templateAnnotation;
        const annotationType = this.props.annotationTypes.find(
          (a) => a.annotationTypeId === annotationTypeId
        );
        if (!annotationType) {
          throw new Error(
            `Could not get annotation type for annotation ${templateAnnotation.name}. Contact Software`
          );
        }

        const type = annotationType.name;
        // When an annotation can have multiple values and it is a Date or Datetime, we need more space.
        const formatterNeedsModal = includes(
          SPECIAL_CASES_FOR_MULTIPLE_VALUES,
          type
        );
        const column: UploadJobColumn = {
          cellClass: styles.formatterContainer,
          dropdownValues: annotationOptions,
          editable: this.props.editable,
          key: name,
          name,
          resizable: true,
          type,
        };

        // dates are handled completely differently from other data types because right now the best
        // way to edit multiple dates is through a modal with a grid. this should probably change in the future.
        if (this.props.editable) {
          column.editor = formatterNeedsModal ? DatesEditor : Editor;
        }

        const headerTextWidth: number =
          getTextWidth("18px Nunito", column.name) + 3 * MAIN_FONT_WIDTH;

        if (type === ColumnType.DATETIME) {
          column.width = Math.max(250, headerTextWidth);
        } else if (type === ColumnType.BOOLEAN) {
          column.width = Math.max(100, headerTextWidth);
        } else {
          column.width = Math.max(DEFAULT_COLUMN_WIDTH, headerTextWidth);
        }

        // eventually we may want to allow undefined Booleans as well but for now, the default value is False
        if (type === ColumnType.BOOLEAN) {
          column.formatter = BooleanFormatter;
        } else {
          column.formatter = ({
            row,
            value,
          }: FormatterProps<UploadJobTableRow>) => {
            const formattedValue = convertToArray(value)
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
            const childEl = <div className={styles.cell}>{formattedValue}</div>;
            return this.renderFormat(row, name, value, childEl, required);
          };
        }
        return column;
      }
    );
    return basicColumns.concat(schemaColumns);
  };

  // This method currently only supports file and wellLabels due to typescript constraints on allowing
  // indexing of objects with a key of type: string since TS7017: Element implicitly has an 'any' type because type
  // 'UploadJobTableRow' has no index signature. Can update this to include more columns or search inside an array
  // of "editableColumns"
  private determineSort = (
    sortColumn: string,
    sortDirection: SortDirections
  ) => {
    if (sortColumn !== "file" && sortColumn !== "wellLabels") {
      Logger.error(`Invalid column sort attempted with column: ${sortColumn}`);
    } else {
      this.setState({ sortColumn, sortDirection });
    }
  };

  // This method converts the value at the key to string to allow this sort of generic comparison with localCompare
  private sortRows = (
    rows: UploadJobTableRow[],
    sortColumn?: SortableColumns,
    sortDirection?: SortDirections
  ): UploadJobTableRow[] => {
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
  };

  private selectRows = (
    rows: Array<{ row: UploadJobTableRow; rowIdx: number }>
  ) => {
    const rowKeys = rows.map((r) => r.row.key);
    this.setState({ selectedRows: [...this.state.selectedRows, ...rowKeys] });
  };

  private deselectRows = (
    rows: Array<{ row: UploadJobTableRow; rowIdx: number }>
  ) => {
    const rowKeys = rows.map((r) => r.row.key);
    const selectedRows = without(this.state.selectedRows, ...rowKeys);
    this.setState({ selectedRows });
  };

  private updateRows = (
    e: AdazzleReactDataGrid.GridRowsUpdatedEvent<UploadJobTableRow>,
    sortedRows: UploadJobTableRow[]
  ) => {
    const { fromRow, toRow, updated } = e;
    // Updated is a { key: value }
    if (updated) {
      const uploadKeys = [];
      for (let i = fromRow; i <= toRow; i++) {
        uploadKeys.push(sortedRows[i].key);
      }
      this.props.updateUploadRows(uploadKeys, updated);
    }
  };

  private removeSelectedRows = (): void => {
    this.props.removeUploads(this.state.selectedRows);
    this.setState({ selectedRows: [] });
  };

  private onDrop = (row: UploadJobTableRow) => async (
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    const notes = await onDrop(e.dataTransfer.files, this.handleError);
    this.props.updateUpload(getUploadRowKeyFromUploadTableRow(row), { notes });
  };

  private saveNotesByRow = (
    row: UploadJobTableRow
  ): ((notes: string | undefined) => void) => {
    return (notes: string | undefined) =>
      this.saveByRow(notes, NOTES_ANNOTATION_NAME, row);
  };

  private saveByRow = (
    value: any,
    key: keyof UploadMetadata,
    row: UploadJobTableRow
  ) => {
    const values = !isNil(value) ? castArray(value) : [];
    this.props.updateUpload(getUploadRowKeyFromUploadTableRow(row), {
      [key]: values,
    });
  };

  private handleError = (error: string) => {
    this.props.setAlert({
      message: error,
      type: AlertType.WARN,
    });
  };

  private onCellExpand = (args: OnExpandArgs) =>
    this.props.toggleRowExpanded(args.rowData.key);

  private getSubRowDetails = (rowItem: UploadJobTableRow) => {
    const { expandedRows } = this.props;
    return {
      ...rowItem,
      expanded: expandedRows[rowItem.key] || false,
      field: "file",
    };
  };

  private addScenes = (
    files: string[],
    positionIndexes: number[],
    channelIds: string[],
    scenes: number[],
    subImageNames: string[]
  ) => {
    files.forEach((file: string) => {
      const row = this.props.uploads.find(
        (upload) => upload.key === getUploadRowKey({ file })
      );
      this.props.updateSubImages(row, {
        positionIndexes,
        channelIds,
        scenes,
        subImageNames,
      });
    });
  };
}

export default CustomDataGrid;
