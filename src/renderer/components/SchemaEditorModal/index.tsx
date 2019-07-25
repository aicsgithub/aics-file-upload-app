import { Button, Modal } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import TextArea from "antd/lib/input/TextArea";
import * as classNames from "classnames";
import { remote } from "electron";
import { writeFile } from "fs";
import { findIndex, includes, isEmpty } from "lodash";
import * as React from "react";
import { ChangeEvent } from "react";

import { ColumnType, SchemaDefinition } from "../../state/setting/types";
import ColumnDefinitionForm, { ColumnDefinitionError } from "./ColumnDefinitionForm";
import EmptyColumnDefinitionRow from "./EmptyColumnDefinitionRow";
import ErrnoException = NodeJS.ErrnoException;

const DEFAULT_COLUMN = Object.freeze({
    label: undefined,
    required: true,
    type: ColumnType.TEXT,
});
const styles = require("./styles.pcss");

interface Props {
    className?: string;
    close: () => void;
    schema?: SchemaDefinition;
    visible: boolean;
}

interface ColumnDefinitionDraft {
    dropdownValues?: string[]; // only applicable if ColumnType is a dropdown
    label?: string;
    type?: ColumnType;
    required?: boolean;
}

interface SchemaEditorModalState {
    columns: Array<ColumnDefinitionDraft | null>;
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
        const { columns, isEditing, notes, selectedRows } = this.state;
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
                        <div className={styles.grid}>
                            <div className={styles.columnHeaders}>
                                <div className={classNames(styles.header, styles.orderColumn)}/>
                                <div className={classNames(styles.header, styles.labelColumn)}>
                                    Column Name
                                </div>
                                <div className={classNames(styles.header, styles.typeColumn)}>
                                    Data Type
                                </div>
                                <div className={classNames(styles.header, styles.requiredColumn)}>
                                    Required?
                                </div>
                            </div>
                            {columns.map((column, i) => {
                                return (
                                    <div
                                        className={classNames(styles.row,
                                            {[styles.selected]: includes(selectedRows, i)})}
                                        key={column && column.label ? column.label + i : i}
                                        onClick={this.selectRow(i)}
                                    >
                                        <div className={classNames(styles.orderColumn, styles.orderNumber)}>
                                            {column ? i + 1 : ""}
                                        </div>
                                        {column && <ColumnDefinitionForm
                                            className={classNames(styles.columnRow)}
                                            dropdownValues={column.dropdownValues}
                                            error={errors[i]}
                                            setIsEditing={this.setIsEditing(i)}
                                            setColumnLabel={this.setLabel(i)}
                                            setColumnType={this.setType(i)}
                                            setDropdownValues={this.setDropdownValues(i)}
                                            setRequired={this.setRequired(i)}
                                            columnType={column.type}
                                            columnLabel={column.label}
                                            isEditing={isEditing[i]}
                                            required={column.required || false}
                                        />}
                                        {!column && <EmptyColumnDefinitionRow key={i} className={styles.columnRow}/>}
                                    </div>
                                );
                            })}
                        </div>
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

    private getInitialState = (schema?: SchemaDefinition): SchemaEditorModalState => {
        const columns: Array<ColumnDefinitionDraft | null> = schema ? schema.columns : [DEFAULT_COLUMN];
        for (let i = columns.length; i < 5; i++) {
            columns.push(null);
        }

        return {
            columns,
            isEditing: columns.map(() => false),
            selectedRows: [],
        };
    }

    private getErrors = (): Array<ColumnDefinitionError | undefined> => {
        const { columns } = this.state;
        const columnNames: string[] = columns
            .filter((c) => !!c)
            .map((c) => c ? c.label : "") as string[];
        return columns.map((col: ColumnDefinitionDraft | null) => {
            if (!col) {
                return undefined;
            }

            const labelIsEmpty = !col.label;
            const dropdownValuesMissing = col.type === ColumnType.DROPDOWN && isEmpty(col.dropdownValues);
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

    private setIsEditing = (index: number) => {
        return (editing: boolean) => {
            const isEditing = [...this.state.isEditing];
            isEditing[index] = editing;
            this.setState({isEditing});
        };
    }

    private selectRow = (index: number) => {
        // todo: Select multiple if CTRL or SHIFT held down
        const columnDefinitionIsNotNull = !!this.state.columns[index];
        if (columnDefinitionIsNotNull) {
            return () => this.setState({selectedRows: [index]});
        }
        return this.addColumn;
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

    private setLabel = (i: number) => {
        return (label?: string) => {
            this.updateColumnRow(i, "label", label);
        };
    }

    private setType = (i: number) => {
        return (type: ColumnType) => {
            this.updateColumnRow(i, "type", type);
        };
    }

    private setDropdownValues = (i: number) => {
        return (values: string[]) => {
            this.updateColumnRow(i, "dropdownValues", values);
        };
    }

    private setRequired = (i: number) => {
        return (e: CheckboxChangeEvent) => {
            this.updateColumnRow(i, "required", e.target.checked);
        };
    }

    private setNotes = (e: ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({notes: e.target.value});
    }

    private afterClose = () => {
        this.setState(this.getInitialState());
    }

    private updateColumnRow = <T extends {}>(index: number, property: keyof ColumnDefinitionDraft, value?: T) => {
        const columns = this.state.columns;
        columns[index] = {
            ...columns[index],
            [property]: value,
        };
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
