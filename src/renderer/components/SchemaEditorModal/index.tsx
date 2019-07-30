import { Button, Modal } from "antd";
import TextArea from "antd/lib/input/TextArea";
import { remote } from "electron";
import { writeFile } from "fs";
import { findIndex, isEmpty } from "lodash";
import * as React from "react";
import { ChangeEvent } from "react";
import ReactDataGrid from "react-data-grid";
import { Editors } from "react-data-grid-addons";

import { ColumnType, SchemaDefinition } from "../../state/setting/types";
import { ColumnDefinitionError } from "./ColumnDefinitionForm";
import ColumnTypeEditor from "./ColumnTypeEditor";
import ColumnTypeFormatter from "./ColumnTypeFormatter";
import ErrnoException = NodeJS.ErrnoException;
import GridRowsUpdatedEvent = AdazzleReactDataGrid.GridRowsUpdatedEvent;

const { CheckboxEditor } = Editors;

const DEFAULT_COLUMN = Object.freeze({
    label: "",
    order: 0,
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
};

const SCHEMA_EDITOR_COLUMNS = [
    {
        frozen: true,
        key: "order",
        name: "",
        width: 50,
    },
    {
        editable: true,
        key: "label",
        name: "Column Name",
        resizable: true,
        width: 300,
    },
    {
        editable: true,
        // @ts-ignore
        editor: <ColumnTypeEditor/>,
        formatter: <ColumnTypeFormatter/>,
        key: "type",
        name: "Data Type",
    },
    {
        editable: true,
        editor: (
            <CheckboxEditor/>
        ),
        formatter: (required: boolean) => required ? <span>True</span> : <span>False</span>,
        key: "required",
        name: "Required?",
        width: 100,
    },
];

interface Props {
    className?: string;
    close: () => void;
    schema?: SchemaDefinition;
    visible: boolean;
}

interface ColumnDefinitionDraft {
    label?: string;
    order: number;
    type?: {
        type: ColumnType,
        dropdownValues?: string[]; // only applicable if ColumnType is a dropdown
    };
    required?: boolean;
}

interface SchemaEditorModalState {
    columns: ColumnDefinitionDraft[];
    notes?: string;
    selectedRows: number[];
    isEditing: boolean[];
}

class SchemaEditorModal extends React.Component<Props, SchemaEditorModalState> {
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
            schema,
            visible,
        } = this.props;
        const { columns, notes, selectedRows } = this.state;
        const errors = this.getErrors();
        const canSave = isEmpty(errors.filter((e) => !!e));
        return (
            <Modal
                width="90%"
                className={className}
                title={schema ? "Edit Schema" : "New Schema"}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={close}
                okText="Save"
                okButtonProps={{
                    disabled: !canSave,
                }}
                maskClosable={false}
                afterClose={this.afterClose}
            >
                <div className={styles.columnDefinitionForm}>
                    <div className={styles.gridAndNotes}>
                        <ReactDataGrid
                            columns={SCHEMA_EDITOR_COLUMNS}
                            rowGetter={this.getRow}
                            rowsCount={columns.length}
                            cellNavigationMode="changeRow"
                            enableCellSelect={true}
                            onGridRowsUpdated={this.updateGridRow}
                        />
                        <TextArea
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

    private getRow = (i: number) => {
        return this.state.columns[i];
    }

    private getInitialState = (schema?: SchemaDefinition): SchemaEditorModalState => {
        const columns: ColumnDefinitionDraft[] = schema ? schema.columns : [DEFAULT_COLUMN];
        for (let i = columns.length; i < 5; i++) {
            columns.push({
                ...DEFAULT_COLUMN,
                order: i,
            });
        }

        return {
            columns,
            isEditing: columns.map(() => false),
            notes: schema ? schema.notes : undefined,
            selectedRows: [],
        };
    }

    private getErrors = (): Array<ColumnDefinitionError | undefined> => {
        const { columns } = this.state;
        const columnNames: string[] = columns
            .filter((c) => !!c)
            .map((c) => c ? c.label : "") as string[];
        return columns.map((col: ColumnDefinitionDraft) => {
            const labelIsEmpty = !col.label;
            const dropdownValuesMissing =  col.type && col.type.type === ColumnType.DROPDOWN
                && isEmpty(col.type.dropdownValues);
            const duplicateLabel = columnNames.filter((name) => name === col.label).length > 1;

            let columnLabelError;
            if (labelIsEmpty) {
                columnLabelError = "This field is required";
            } else if (duplicateLabel) {
                columnLabelError = "Column names must be unique";
            }

            return labelIsEmpty || dropdownValuesMissing || duplicateLabel ? {
                columnLabel: columnLabelError,
                columnType: dropdownValuesMissing ? "Dropdown values are required" : undefined,
            } : undefined;
        });
    }

    private saveAndClose = () => {
        const schemaJson = JSON.stringify(
            {
                columns: this.state.columns.filter((c) => !!c && c.label && c.type),
                notes: this.state.notes,
            }
        );

        remote.dialog.showSaveDialog({
            filters: [
                {name: "JSON", extensions: ["json"]},
            ],
            title: "Save Schema",
        }, (filename?: string) => {
            if (filename) {
                if (!filename.endsWith(".json")) {
                    filename = `${filename}.json`;
                }
                writeFile(filename, schemaJson, (err: ErrnoException | null) => {
                    if (err) {
                        remote.dialog.showErrorBox("Error", err.message);
                    } else {
                        this.props.close();
                    }
                });
            }
        });
    }

    private setNotes = (e: ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({notes: e.target.value});
    }

    private afterClose = () => {
        this.setState(this.getInitialState());
    }

    private updateGridRow = (e: GridRowsUpdatedEvent<ColumnDefinitionDraft>) => {
        const { fromRow, toRow, updated } = e;
        console.log(e);
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
        const columns = [...this.state.columns];

        // first look for empty column definition forms
        const firstEmptyColumnDefinition = findIndex(columns, (col) => col !== null && !col.label);

        if (firstEmptyColumnDefinition > -1) {
            // focus column name input
            const isEditing = [...this.state.isEditing];
            isEditing[firstEmptyColumnDefinition] = true;
            this.setState({isEditing, selectedRows: []});

        } else {
            // find first empty row and convert that to a column definition form or else append a form to the end
            // of the list.
            const firstNullIndex = findIndex(columns, (col) => col === null);
            const isEditing = [...this.state.isEditing];
            if (firstNullIndex < 0) {
                columns.push(DEFAULT_COLUMN);
                isEditing.push(true);
            } else {
                columns[firstNullIndex] = DEFAULT_COLUMN;
                isEditing[firstNullIndex] = true;
            }
            this.setState({
                columns,
                isEditing,
                selectedRows: [],
            });
        }
    }

    private removeColumns = () => {
        const { selectedRows } = this.state;
        const columns = [...this.state.columns];
        selectedRows.forEach((row) => {
            columns.splice(row, 1);
        });
        this.setState({ columns, selectedRows: [] });
    }
}

export default SchemaEditorModal;
