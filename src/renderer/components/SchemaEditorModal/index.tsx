import { Button, Modal } from "antd";
import * as classNames from "classnames";
import { includes, set } from "lodash";
import * as React from "react";
import { ActionCreator } from "redux";
import { ColumnType, CreateSchemaAction, SchemaDefinition } from "../../state/setting/types";
import ColumnDefinitionForm from "./ColumnDefinitionForm";

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

interface SchemaEditorModalState {
    columns: Array<{label?: string, type?: ColumnType}>;
    selectedRows: number[];
}

class SchemaEditorModal extends React.Component<Props, SchemaEditorModalState> {
    constructor(props: Props) {
        super(props);

        this.state = {
            columns: props.schema ? props.schema.columns : [],
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
        const { columns, selectedRows } = this.state;
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
                    {columns.map((column, i) => (
                        <ColumnDefinitionForm
                          className={classNames(styles.columnRow, {
                              [styles.selected]: includes(selectedRows, i),
                          })}
                          key={column.label || i}
                          onClick={this.selectRow(i)}
                          setColumnLabel={this.setLabel(i)}
                          setColumnType={this.setType(i)}
                          columnType={column.type}
                          columnLabel={column.label}
                        />
                    ))}
                </div>
                <div className={styles.buttonRow}>
                    <Button icon="plus" className={styles.plus} onClick={this.addColumn}/>
                    <Button icon="minus" className={styles.minus} onClick={this.removeColumns}/>
                </div>
            </Modal>
        );
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
        this.setState({
            columns: [...this.state.columns, DEFAULT_COLUMN],
        });
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
