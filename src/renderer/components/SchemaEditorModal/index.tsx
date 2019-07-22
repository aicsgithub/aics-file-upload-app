import { Button, Modal } from "antd";
import * as classNames from "classnames";
import { findIndex, findLastIndex, includes, noop, set } from "lodash";
import * as React from "react";
import { ActionCreator } from "redux";
import { ColumnType, CreateSchemaAction, SchemaDefinition } from "../../state/setting/types";
import ColumnDefinitionForm from "./ColumnDefinitionForm";
import EmptyColumnDefinitionRow from "./EmptyColumnDefinitionRow";

const DEFAULT_COLUMN = Object.freeze({
    label: undefined,
    type: ColumnType.TEXT,
});
const styles = require("./styles.pcss");

interface Props {
    className?: string;
    createSchema: ActionCreator<CreateSchemaAction>;
    close: () => void;
    schema?: SchemaDefinition;
    visible: boolean;
}

interface ColumnDefinitionDraft {
    label?: string;
    type?: ColumnType;
}

interface SchemaEditorModalState {
    columns: Array<ColumnDefinitionDraft | null>;
    selectedRows: number[];
    isEditing: boolean[];
}

class SchemaEditorModal extends React.Component<Props, SchemaEditorModalState> {
    public lastInput?: HTMLInputElement;

    constructor(props: Props) {
        super(props);

        const columns: Array<ColumnDefinitionDraft | null> = props.schema ? props.schema.columns : [];
        for (let i = columns.length; i < 5; i++) {
            columns.push(null);
        }

        this.state = {
            columns,
            isEditing: columns.map(() => false),
            selectedRows: [],
        };
    }

    public render() {
        const {
            className,
            close,
            schema,
            visible,
        } = this.props;
        const { columns, isEditing, selectedRows } = this.state;
        return (
            <Modal
                width="90%"
                className={className}
                title={schema ? "Edit Schema" : "New Schema"}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={close}
            >
                <div className={styles.columns}>
                    <div className={styles.columnHeaders}>
                        <div className={styles.labelHeader}>
                            Column Name
                        </div>
                        <div className={styles.typeHeader}>
                            Data Type
                        </div>
                    </div>
                    {columns.map((column, i) => {
                        if (!column) {
                            return <EmptyColumnDefinitionRow key={i}/>;
                        }

                        return (
                            <ColumnDefinitionForm
                                className={classNames(styles.columnRow, {
                                    [styles.selected]: includes(selectedRows, i),
                                })}
                                key={column.label || i}
                                onClick={this.selectRow(i)}
                                setIsEditing={this.setIsEditing(i)}
                                setColumnLabel={this.setLabel(i)}
                                setColumnType={this.setType(i)}
                                columnType={column.type}
                                columnLabel={column.label}
                                isEditing={isEditing[i]}
                                // ref={(form: ColumnDefinitionForm) => {
                                //     const lastNonNullRowIndex = findLastIndex(columns, (col) => col !== null);
                                //     if (i === lastNonNullRowIndex && form) {
                                //         this.lastInput = form.input;
                                //     }
                                // }}
                            />
                        );
                    })}
                </div>
                <div className={styles.buttonRow}>
                    <Button icon="plus" className={styles.plus} onClick={this.addColumn}/>
                    <Button icon="minus" className={styles.minus} onClick={this.removeColumns}/>
                </div>
            </Modal>
        );
    }

    private setIsEditing = (index: number) => {
        return (editing: boolean) => {
            const isEditing = [...this.state.isEditing];
            isEditing[index] = editing;
            this.setState({isEditing});
        };
    }

    private selectRow = (index: number) => {
        return () => this.setState({selectedRows: [index]});
    }

    private saveAndClose = () => {
        // this.props.createSchema(this.state.draft);
        this.props.close();
    }

    private setType = (i: number) => {
        return (type: ColumnType) => {
            const columns = [...this.state.columns];
            set(columns, `[${i}].type`, type);
            this.setState({columns});
        };
    }

    private setLabel = (i: number) => {
        return (label?: string) => {
            const columns = [...this.state.columns];
            columns[i] = {
                ...columns[i],
                label,
            };
            this.setState({columns});
        };
    }

    private addColumn = () => {
        const columns = [...this.state.columns];

        // first look for empty column definition forms
        const firstEmptyColumnDefinition = findIndex(columns, (col) => col !== null && !col.label);

        if (firstEmptyColumnDefinition > -1) {
            // focus column name input
            const isEditing = [...this.state.isEditing];
            isEditing[firstEmptyColumnDefinition] = true;
            this.setState({isEditing});
            if (this.lastInput) {
                this.lastInput.focus();
            }

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
            });
        }
    }

    private removeColumns = () => {
        const { selectedRows } = this.state;
        const columns = [...this.state.columns];
        selectedRows.forEach((row) => {
            columns.splice(row, 1);
        });
        this.setState({ columns });
    }
}

export default SchemaEditorModal;
