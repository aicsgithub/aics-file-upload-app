import { Alert, Button, Tooltip } from "antd";
import * as classNames from "classnames";
import { MenuItem, MenuItemConstructorOptions } from "electron";
import Logger from "js-logger";
import { castArray, isEmpty, isNil, without } from "lodash";
import * as moment from "moment";
import * as React from "react";
import ReactDataGrid from "react-data-grid";
import { ActionCreator } from "redux";

import NoteIcon from "../../components/NoteIcon";
import {
  DATE_FORMAT,
  DATETIME_FORMAT,
  LIST_DELIMITER_JOIN,
  MAIN_FONT_WIDTH,
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
} from "../../constants";
import DragAndDropRow from "../../containers/AddCustomData/DragAndDropRow";
import TutorialTooltip from "../../containers/TutorialTooltip";
import {
  AnnotationType,
  Channel,
  ColumnType,
} from "../../services/labkey-client/types";
import { Template, TemplateAnnotation } from "../../services/mms-client/types";
import { SetAlertAction } from "../../state/feedback/types";
import {
  LoadFilesFromOpenDialogAction,
  ToggleExpandedUploadJobRowAction,
  UpdateMassEditRowAction,
  Well,
} from "../../state/selection/types";
import {
  AlertType,
  ExpandedRows,
  MassEditRow,
  TutorialStep,
  UploadMetadata,
} from "../../state/types";
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
import { Duration } from "../../types";
import { convertToArray, getTextWidth } from "../../util";
import BooleanFormatter from "../BooleanFormatter";

import CellWithContextMenu from "./CellWithContextMenu";
import DatesEditor from "./DatesEditor";
import DurationEditor from "./DurationEditor";
import Editor from "./Editor";
import FileFormatter from "./FileFormatter";
import { FormatterProps } from "./types";
import WellsEditor from "./WellsEditor";

const styles = require("./style.pcss");

const DEFAULT_COLUMN_WIDTH = 170;
const GRID_ROW_HEIGHT = 35;
const GRID_BOTTOM_PADDING = 60;
type SortableColumns = "file" | "wellLabels";
type SortDirections = "ASC" | "DESC" | "NONE";

interface Props {
  allWellsForSelectedPlate: Well[][];
  annotationTypes: AnnotationType[];
  canAddMoreFiles: boolean;
  canUndo: boolean;
  canRedo: boolean;
  channels: Channel[];
  className?: string;
  editable: boolean;
  expandedRows: ExpandedRows;
  fileToAnnotationHasValueMap: { [file: string]: { [key: string]: boolean } };
  hideUploadHints: () => void;
  onFileBrowse: (files: string[]) => LoadFilesFromOpenDialogAction;
  massEditRow: MassEditRow;
  redo: () => void;
  removeUploads: ActionCreator<RemoveUploadsAction>;
  template?: Template;
  setAlert: ActionCreator<SetAlertAction>;
  showErrorsForRequiredFields: boolean;
  showUploadHint: boolean;
  toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
  undo: () => void;
  updateMassEditRow: ActionCreator<UpdateMassEditRowAction>;
  updateSubImages: ActionCreator<UpdateSubImagesAction>;
  updateUpload: ActionCreator<UpdateUploadAction>;
  updateUploadRows: ActionCreator<UpdateUploadRowsAction>;
  uploads: UploadJobTableRow[];
  validationErrors: { [key: string]: { [annotationName: string]: string } };
}

interface CustomDataState {
  addValuesRow?: UploadJobTableRow;
  selectedRows: string[];
  showMassEditGrid: boolean;
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

interface MassEditColumn extends AdazzleReactDataGrid.Column<MassEditRow> {
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
  private getWellUploadColumns(forMassEdit = false): UploadJobColumn[] {
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
            : this.renderFormat(
                row,
                "wellLabels",
                value,
                undefined,
                true,
                forMassEdit
              );
        },
        key: "wellLabels",
        name: "Wells",
        resizable: true,
        sortable: !forMassEdit,
        width: DEFAULT_COLUMN_WIDTH,
      },
    ];
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedRows: [],
      showMassEditGrid: false,
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
    const massEditRowGetter = (idx: number) => [this.props.massEditRow][idx];

    return (
      <>
        {this.state.showMassEditGrid && (
          <>
            <div className={styles.shadowBox} />
            <div className={styles.massEdit}>
              {this.props.showUploadHint && (
                <Alert
                  afterClose={this.props.hideUploadHints}
                  className={styles.hint}
                  closable={true}
                  message="Hint: Make edits below and all edits will be applied to selected rows. Click Apply to complete changes."
                  showIcon={true}
                  type="info"
                  key="hint"
                />
              )}
              <div className={classNames(styles.dataGrid, className)}>
                <ReactDataGrid
                  cellNavigationMode="loopOverRow"
                  columns={this.getMassEditColumns()}
                  enableCellSelect={true}
                  minHeight={GRID_ROW_HEIGHT + GRID_BOTTOM_PADDING}
                  onGridRowsUpdated={(e) => this.updateMassEditRows(e)}
                  rowGetter={massEditRowGetter}
                  rowsCount={1}
                />
              </div>
              <div className={styles.alignCenter}>
                <Button
                  className={styles.massEditButton}
                  type="danger"
                  size="large"
                  onClick={() => {
                    this.setState({ showMassEditGrid: false });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className={styles.massEditButton}
                  type="primary"
                  size="large"
                  onClick={() => this.updateRowsWithMassEditInfo()}
                >
                  Apply
                </Button>
              </div>
            </div>
          </>
        )}
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
          <TutorialTooltip
            disabled={!Object.keys(uploads).length}
            placement="right"
            step={TutorialStep.MASS_EDIT}
            title="Mass Edit"
            message="Select rows and click here to edit multiple rows at once"
          >
            <Tooltip title="Edit Selected Rows All at Once" mouseLeaveDelay={0}>
              <Button
                onClick={() =>
                  this.openMassEditGrid(sortedRows, this.getColumns())
                }
                disabled={isEmpty(selectedRows)}
                icon="edit"
                type="link"
              />
            </Tooltip>
          </TutorialTooltip>
          <Tooltip title="Delete Selected Rows" mouseLeaveDelay={0}>
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
            <>
              <TutorialTooltip
                step={TutorialStep.INPUT_MULTIPLE_VALUES}
                title="Add Multiple Values"
                message="You can add multiple values for Text and Number annotations using commas!"
              >
                <ReactDataGrid
                  cellNavigationMode="changeRow"
                  columns={this.getColumns()}
                  enableCellSelect={true}
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
              </TutorialTooltip>
              {this.props.canAddMoreFiles && (
                <DragAndDropRow onBrowse={this.props.onFileBrowse} />
              )}
            </>
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
    forMassEditRows?: boolean,
    className?: string,
    contextMenuItems?: Array<MenuItemConstructorOptions | MenuItem>
  ): React.ReactElement => {
    value = convertToArray(value);
    // If a required field is not filled out, show error for that first.
    // If filled out but there is additional issues like misformatted lists (e.g. "a, b, c,")
    // then show a error related to that.
    const { validationErrors } = this.props;
    let error;
    if (!forMassEditRows) {
      const showFieldIsRequiredError =
        required &&
        this.props.showErrorsForRequiredFields &&
        !this.props.fileToAnnotationHasValueMap[row.file][label];
      if (showFieldIsRequiredError) {
        error = `${label} is required`;
      } else if (
        validationErrors[row.key] &&
        validationErrors[row.key][label]
      ) {
        error = validationErrors[row.key][label];
      }
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
              showTutorial={row.siblingIndex === 0 && row.treeDepth === 0}
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
          >
            {(this.props.editable || !!row[NOTES_ANNOTATION_NAME]) && (
              <NoteIcon
                editable={this.props.editable}
                handleError={this.handleError}
                notes={row[NOTES_ANNOTATION_NAME]}
                saveNotes={this.saveNotesByRow(row)}
              />
            )}
          </div>
        ),
        key: NOTES_ANNOTATION_NAME,
        name: NOTES_ANNOTATION_NAME,
        width: 80,
      },
    ];
  };

  private getSchemaColumns = (forMassEditRows = false): UploadJobColumn[] => {
    const {
      annotationTypes,
      editable,
      template,
      showErrorsForRequiredFields,
    } = this.props;
    if (!template || !template.annotations) {
      return [];
    }
    return template.annotations.map(
      (templateAnnotation: TemplateAnnotation) => {
        const {
          name,
          annotationTypeId,
          annotationOptions,
          required,
        } = templateAnnotation;
        const annotationType = annotationTypes.find(
          (a) => a.annotationTypeId === annotationTypeId
        );
        if (!annotationType) {
          throw new Error(
            `Could not get annotation type for annotation ${templateAnnotation.name}. Contact Software`
          );
        }

        const type = annotationType.name;
        const column: UploadJobColumn & {
          // The version of React Data Grid we are using has a bug where
          // columns do not update as expected in certain situations. In our
          // case, we were having an issue with validation errors not showing up
          // in the rows after a user clicks "Upload" until there was another
          // interaction with the grid. Adding this field which will change from
          // 'false' to 'true' in this scenario will make the grid update as
          // expected. This was inspired by this suggestion:
          // https://github.com/adazzle/react-data-grid/issues/709#issuecomment-452647471
          showErrorsForRequiredFields: boolean;
        } = {
          cellClass: styles.formatterContainer,
          dropdownValues: annotationOptions,
          editable,
          key: name,
          name,
          resizable: true,
          type,
          showErrorsForRequiredFields,
        };

        if (required) {
          column.headerRenderer = ({ column }: { column: UploadJobColumn }) => (
            <Tooltip title={`${column.name} is required`} mouseLeaveDelay={0}>
              {column.name}*
            </Tooltip>
          );
        }

        // dates are handled completely differently from other data types because right now the best
        // way to edit multiple dates is through a modal with a grid. this should probably change in the future.
        if (editable) {
          if (type === ColumnType.DATE || type === ColumnType.DATETIME) {
            column.editor = DatesEditor;
          } else if (type === ColumnType.DURATION) {
            column.editor = DurationEditor;
          } else {
            column.editor = Editor;
          }
        }

        const headerTextWidth: number =
          getTextWidth("18px Nunito", column.name) + 3 * MAIN_FONT_WIDTH;

        if (type === ColumnType.DATETIME) {
          column.width = Math.max(250, headerTextWidth);
        } else if (type === ColumnType.BOOLEAN) {
          column.width = Math.max(100, headerTextWidth);
        } else if (type === ColumnType.DURATION) {
          column.width = Math.max(250, headerTextWidth);
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
              .map((v: any): string => {
                switch (type) {
                  case ColumnType.DATETIME:
                    return moment(v).format(DATETIME_FORMAT);
                  case ColumnType.DATE:
                    return moment(v).format(DATE_FORMAT);
                  case ColumnType.DURATION: {
                    const { days, hours, minutes, seconds } = v as Duration;
                    let duration = "";
                    if (days) {
                      duration += `${days}D `;
                    }
                    if (hours) {
                      duration += `${hours}H `;
                    }
                    if (minutes) {
                      duration += `${minutes}M `;
                    }
                    if (seconds) {
                      duration += `${seconds}S`;
                    }
                    return duration.trim();
                  }
                  default:
                    return v;
                }
              })
              .join(LIST_DELIMITER_JOIN);
            const childEl = <div className={styles.cell}>{formattedValue}</div>;
            return this.renderFormat(
              row,
              name,
              formattedValue,
              childEl,
              required,
              forMassEditRows
            );
          };
        }
        return column;
      }
    );
  };

  private getColumns = (): UploadJobColumn[] => {
    if (!this.props.uploads.length) {
      return [];
    }
    let basicColumns;
    if (this.props.allWellsForSelectedPlate.length) {
      basicColumns = this.uploadColumns(this.getWellUploadColumns());
    } else {
      basicColumns = this.uploadColumns([]);
    }
    if (!this.props.template) {
      return basicColumns;
    }
    const schemaColumns = this.getSchemaColumns();
    return basicColumns.concat(schemaColumns);
  };

  private getMassEditColumns = (): MassEditColumn[] => {
    if (!this.props.template || !this.props.template.annotations) {
      return [];
    }
    const numberFiles: MassEditColumn = {
      key: "massEditNumberOfFiles",
      name: "# Files Selected",
      editable: false,
      formatter: ({ row, value }: FormatterProps<UploadJobTableRow>) =>
        this.renderFormat(row, "Number of Files Selected", value),
      resizable: true,
      width: DEFAULT_COLUMN_WIDTH,
      type: ColumnType.NUMBER,
    };
    const notes: MassEditColumn = {
      formatter: ({ row }: FormatterProps<UploadJobTableRow>) => (
        <div
          className={classNames(
            styles.formatterContainer,
            styles.noteIconContainer
          )}
        >
          <NoteIcon
            editable={this.props.editable}
            handleError={this.handleError}
            notes={row[NOTES_ANNOTATION_NAME]}
            saveNotes={this.saveMassEditNotes}
          />
        </div>
      ),
      key: NOTES_ANNOTATION_NAME,
      name: NOTES_ANNOTATION_NAME,
      width: 80,
    };
    let basicColumns: UploadJobColumn[] = [];
    if (this.props.allWellsForSelectedPlate.length) {
      basicColumns = this.getWellUploadColumns(true);
    }
    const schemaColumns = this.getSchemaColumns(true);
    return [numberFiles, ...basicColumns, notes, ...schemaColumns].map(
      (column) => column as MassEditColumn
    );
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
    return rows;
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

  private openMassEditGrid = (
    sortedRows: Array<UploadJobTableRow>,
    columns: UploadJobColumn[]
  ) => {
    // Initialize an empty grid row with the same columns as the standard editing grid
    const emptyMassEditRow: MassEditRow = {
      massEditNumberOfFiles: this.state.selectedRows.length,
      wellLabels: [],
      Notes: undefined,
    };
    columns.forEach((column) => {
      if (column["name"] === "Wells") {
        // Special case where column name != annotation name TODO: Handle others?
        emptyMassEditRow[WELL_ANNOTATION_NAME] = [];
      } else if (column["name"] === NOTES_ANNOTATION_NAME) {
        emptyMassEditRow[NOTES_ANNOTATION_NAME] = "";
      } else {
        emptyMassEditRow[column["name"]] =
          column.type === ColumnType.BOOLEAN ? [false] : [];
      }
    });
    this.setState({
      showMassEditGrid: true,
    });
    this.props.updateMassEditRow({
      ...this.props.massEditRow,
      ...emptyMassEditRow,
    });
  };

  private updateMassEditRows = (
    e: AdazzleReactDataGrid.GridRowsUpdatedEvent<MassEditRow>
  ) => {
    const { updated } = e;
    if (updated) {
      this.props.updateMassEditRow({ ...this.props.massEditRow, ...e.updated });
    }
  };

  private updateRowsWithMassEditInfo = () => {
    const massEditRow = this.props.massEditRow;
    const updateRow: Partial<UploadMetadata> = {};
    Object.keys(massEditRow).map((key) => {
      if (Array.isArray(massEditRow[key])) {
        if (massEditRow[key].length > 0) {
          updateRow[key] = massEditRow[key];
        }
      } else if (key === NOTES_ANNOTATION_NAME) {
        updateRow[key] = massEditRow[NOTES_ANNOTATION_NAME]
          ? [massEditRow[NOTES_ANNOTATION_NAME]]
          : undefined;
      } else if (massEditRow[key] !== null) {
        updateRow[key] = massEditRow[key];
      }
    });
    this.props.updateUploadRows(this.state.selectedRows, updateRow);
    this.setState({ showMassEditGrid: false });
  };

  private removeSelectedRows = (): void => {
    this.props.removeUploads(this.state.selectedRows);
    this.setState({ selectedRows: [] });
  };

  private saveNotesByRow = (
    row: UploadJobTableRow
  ): ((notes: string | undefined) => void) => {
    return (notes: string | undefined) =>
      this.saveByRow(notes, NOTES_ANNOTATION_NAME, row);
  };

  private saveMassEditNotes = (notes: string | undefined) => {
    this.props.updateMassEditRow({ ...this.props.massEditRow, Notes: notes });
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
