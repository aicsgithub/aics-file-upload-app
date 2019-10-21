import { Button, Icon, Input, Modal, Select } from "antd";
import TextArea from "antd/lib/input/TextArea";
import { remote } from "electron";
import { writeFile } from "fs";
import { isEmpty, uniqBy, without } from "lodash";
import * as React from "react";
import { ChangeEvent, ReactNodeArray } from "react";
import ReactDataGrid from "react-data-grid";
import { ActionCreator } from "redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";

import { AlertType, SetAlertAction } from "../../state/feedback/types";
import { DatabaseMetadata } from "../../state/metadata/types";
import { ColumnType, SchemaDefinition } from "../../state/setting/types";

import BooleanEditor from "../BooleanHandler/BooleanEditor";
import BooleanFormatter from "../BooleanHandler/BooleanFormatter";
import FormControl from "../FormControl";
import FormPage from "../FormPage";
import LabeledInput from "../LabeledInput";

import ColumnTypeEditor from "./ColumnTypeEditor";
import ColumnTypeFormatter from "./ColumnTypeFormatter";

const DEFAULT_COLUMN = (index: number): ColumnDefinitionDraft => ({
    index,
    label: "",
    required: false,
    type: {
        type: ColumnType.TEXT,
    },
});
const styles = require("./styles.pcss");

export const COLUMN_TYPE_DISPLAY_MAP: {[id in ColumnType]: string} = {
  [ColumnType.TEXT]: "Text",
  [ColumnType.DROPDOWN]: "Dropdown",
  [ColumnType.BOOLEAN]: "Yes/No",
  [ColumnType.DATETIME]: "Date and Time",
  [ColumnType.DATE]: "Date",
  [ColumnType.NUMBER]: "Number",
  [ColumnType.LOOKUP]: "LabKey Lookup",
};

export interface ColumnTypeValue {
    column?: string; // only applicable if ColumnType is a lookup
    type: ColumnType;
    dropdownValues?: string[]; // only applicable if ColumnType is a dropdown
    table?: string; // only applicable if ColumnType is a lookup
}

interface ColumnTypeColumn extends AdazzleReactDataGrid.Column<ColumnDefinitionDraft> {
    tables?: DatabaseMetadata;
}

interface Props {
    className?: string;
    close: () => void;
    columnNameSearchResults: string[];
    filepath?: string;
    onSchemaFileCreated?: (filepath: string) => void;
    schema?: SchemaDefinition;
    setAlert: ActionCreator<SetAlertAction>;
    tables?: DatabaseMetadata;
    visible: boolean;
}

interface ColumnDefinitionDraft {
    index: number;
    label?: string;
    type: ColumnTypeValue;
    required?: boolean;
}

interface SchemaEditorModalState {
    columnName?: string;
    columns: ColumnDefinitionDraft[];
    notes?: string;
    selectedRows: number[];
}

class SchemaEditorModal extends React.Component<Props, SchemaEditorModalState> {
    private static addIndexToElements(arr: any[]): any[] {
        return arr.map((element: any, index: number) => ({ ...element, index }));
    }

    constructor(props: Props) {
        super(props);
        this.state = this.getInitialState(props.schema);
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.schema !== this.props.schema) {
            this.setState(this.getInitialState(this.props.schema));
        }
    }

    public render() {
        const {
            className,
            close,
            columnNameSearchResults,
            schema,
            visible,
        } = this.props;
        const { columnName, columns, notes, selectedRows } = this.state;
        const options: ReactNodeArray = columnNameSearchResults.map((option: Annotation) => (
            <Select.Option key={option.name}>{option.name}</Select.Option>
        ));

        return (
            <Modal
                width="90%"
                className={className}
                title={schema ? `Edit ${SCHEMA_SYNONYM}` : `New ${SCHEMA_SYNONYM}`}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={close}
                okText="Save"
                okButtonProps={{disabled: !this.canSave()}}
                maskClosable={false}
                afterClose={this.afterClose}
            >
                <LabeledInput label="Column Name">
                    <Select
                        suffixIcon={<Icon type="search"/>}
                        allowClear={true}
                        className={styles.select}
                        showSearch={true}
                        showArrow={false}
                        notFoundContent={null}
                        value={columnName}
                        placeholder="Barcode"
                        autoFocus={true}
                        autoClearSearchValue={true}
                        onChange={this.onBarcodeChange}
                        onSearch={this.onBarcodeInput}
                        loading={loadingAnnotations}
                        defaultActiveFirstOption={false}
                    >
                        {options}
                    </Select>
                </LabeledInput>
                <div className={styles.columnDefinitionForm}>
                    <div className={styles.gridAndNotes}>
                        <ReactDataGrid
                            columns={this.schemaEditorColumns()}
                            rowGetter={this.getRow}
                            rowsCount={columns.length}
                            cellNavigationMode="changeRow"
                            enableCellSelect={true}
                            onGridRowsUpdated={this.updateGridRow}
                            rowSelection={{
                                enableShiftSelect: true,
                                onRowsDeselected: this.deselectRows,
                                onRowsSelected: this.selectRows,
                                selectBy: {
                                    indexes: selectedRows,
                                },
                            }}
                        />
                        <TextArea
                            className={styles.notes}
                            rows={4}
                            placeholder="Notes for your team"
                            onChange={this.setNotes}
                            value={notes}
                        />
                    </div>
                    <div className={styles.buttons}>
                        <Button icon="plus" onClick={this.addColumn}/>
                        <Button icon="minus" onClick={this.removeColumns} disabled={isEmpty(selectedRows)}/>
                    </div>
                </div>
            </Modal>
        );
    }

    // `tables` isn't guaranteed to have loaded by the time this is clicked, need to allow this to update with the props
    private schemaEditorColumns = (): ColumnTypeColumn[] => ([
        {
            editable: true,
            formatter: ({value}: {value: string}) => {
                let error;
                if (!value) {
                    error = "This field is required";
                } else if (this.state.columns.filter((c) => c.label === value).length > 1) {
                    error = "Column names must be unique";
                }
                return (
                    <FormControl
                        error={error}
                    >
                        {value}
                    </FormControl>
                );
            },
            key: "label",
            name: "Column Name",
            resizable: true,
            tables: this.props.tables,
            width: 300,
        },
        {
            editable: true,
            editor: ColumnTypeEditor,
            formatter: ColumnTypeFormatter,
            key: "type",
            name: "Data Type",
            tables: this.props.tables,
        },
        {
            editable: true,
            editor: BooleanEditor,
            formatter: (props) => <BooleanFormatter {...props} rowKey="required" saveValue={this.saveValueByRow} />,
            key: "required",
            name: "Required?",
            tables: this.props.tables,
            width: 100,
        },
    ])

    private saveValueByRow = (value: any, key: string, row: ColumnDefinitionDraft): void => {
        const columns = [...this.state.columns];
        columns[row.index] = {
            ...columns[row.index],
            [key]: value,
        };
        this.setState({columns});
    }

    private getRow = (i: number): ColumnDefinitionDraft => this.state.columns[i];

    private getInitialState = (schema?: SchemaDefinition): SchemaEditorModalState => {
        const columns: ColumnDefinitionDraft[] = schema ?
            SchemaEditorModal.addIndexToElements(schema.columns)
            :
            [DEFAULT_COLUMN(0)];

        return {
            columns,
            notes: schema ? schema.notes : undefined,
            selectedRows: [],
        };
    }

    private canSave = (): boolean => {
        const { columns } = this.state;
        const columnWithNoTypeFound: boolean = !!columns.find(({type}) => !type || !type.type);
        const duplicateNamesFound: boolean = this.duplicateNamesFound();
        const columnWithNoLabelFound: boolean = !!columns.find(({label}) => !label);
        const dropdownValuesMissing: boolean = !!columns
            .find(({type}) => type.type === ColumnType.DROPDOWN && isEmpty(type.dropdownValues));
        const lookupValuesMissing: boolean = !!columns
            .find(({type}) => type.type === ColumnType.LOOKUP && (!type.table || !type.column));

        return !duplicateNamesFound &&
               !columnWithNoLabelFound &&
               !dropdownValuesMissing &&
               !columnWithNoTypeFound &&
               !lookupValuesMissing;
    }

    private duplicateNamesFound = (): boolean => {
        let { columns } = this.state;
        columns = columns.filter((c) => !!c.label);
        return uniqBy(columns, "label").length !== columns.length;
    }

    private writeFile = (filename: string) => {
        const schemaJson = JSON.stringify(
            {
                columns: this.state.columns,
                notes: this.state.notes,
            }
        );
        writeFile(filename, schemaJson, (err: NodeJS.ErrnoException | null) => {
            if (err) {
                this.props.setAlert({
                    message: err.message || "Unknown error occurred while saving file",
                    type: AlertType.ERROR,
                });
            } else {
                if (this.props.onSchemaFileCreated) {
                    this.props.onSchemaFileCreated(filename);
                }
                this.props.close();
            }
        });
    }

    private saveAndClose = () => {
        if (this.props.filepath) {
            this.writeFile(this.props.filepath);
        } else {
            remote.dialog.showSaveDialog({
                filters: [
                    {name: "JSON", extensions: ["json"]},
                ],
                title: `Save ${SCHEMA_SYNONYM}`,
            }, (filename?: string) => {
                if (filename) {
                    if (!filename.endsWith(".json")) {
                        filename = `${filename}.json`;
                    }

                    this.writeFile(filename);
                }
            });
        }
    }

    private setNotes = (e: ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({notes: e.target.value});
    }

    private afterClose = () => {
        this.setState(this.getInitialState());
    }

    private updateGridRow = (e: AdazzleReactDataGrid.GridRowsUpdatedEvent<ColumnDefinitionDraft>) => {
        const { fromRow, toRow, updated } = e;
        const columns = [...this.state.columns];
        for (let i = fromRow; i <= toRow; i++) {
            columns[i] = {
                ...columns[i],
                ...updated,
            };
        }
        this.setState({columns});
    }

    private addColumn = () => {
        this.setState({columns: [...this.state.columns, DEFAULT_COLUMN(this.state.columns.length)]});
    }

    private removeColumns = () => {
        const { selectedRows } = this.state;
        const columns = [...this.state.columns];
        selectedRows.forEach((row) => {
            columns.splice(row, 1);
        });
        this.setState({ columns: SchemaEditorModal.addIndexToElements(columns), selectedRows: [] });
    }

    private selectRows = (rows: Array<{rowIdx: number}>) => {
        const indexes = rows.map((r) => r.rowIdx);
        this.setState({selectedRows: [...this.state.selectedRows, ...indexes]});
    }

    private deselectRows = (rows: Array<{rowIdx: number}>) => {
        const indexes = rows.map((r) => r.rowIdx);
        const selectedRows = without(this.state.selectedRows, ...indexes);
        this.setState({selectedRows});
    }
}

export default SchemaEditorModal;
