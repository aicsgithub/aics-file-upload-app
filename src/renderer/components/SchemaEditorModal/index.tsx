import { LabKeyOptionSelector } from "@aics/aics-react-labkey";
import { Button, Modal } from "antd";
import { ChangeEvent } from "react";
import * as React from "react";
import { ActionCreator } from "redux";
import { ColumnDefinition, ColumnType, CreateSchemaAction, SchemaDefinition } from "../../state/setting/types";
import LabeledInput from "../LabeledInput";

const styles = require("./styles.pcss");
const DEFAULT_COLUMN_TYPE = Object.freeze({
    id: ColumnType.TEXT,
    name: "Text",
});
const COLUMN_TYPE_OPTIONS: ColumnTypeOption[] = [
    DEFAULT_COLUMN_TYPE,
    {
        id: ColumnType.BOOLEAN,
        name: "Yes/No",
    },
    {
        id: ColumnType.NUMBER,
        name: "Number",
    },
    {
        id: ColumnType.DATE,
        name: "Date",
    },
];

interface ColumnTypeOption {
    name: string;
    id: ColumnType;
}

interface Props {
    className?: string;
    createSchema: ActionCreator<CreateSchemaAction>;
    close: () => void;
    schema?: SchemaDefinition;
    visible: boolean;
}

interface SchemaEditorModalState {
    columns: ColumnDefinition[];
    draftColumnLabel?: string;
    draftColumnType?: ColumnTypeOption;
}

class SchemaEditorModal extends React.Component<Props, SchemaEditorModalState> {
    constructor(props: Props) {
        super(props);

        this.state = {
            columns: props.schema ? props.schema.columns : [],
            draftColumnLabel: undefined,
            draftColumnType:  {
                id: ColumnType.TEXT,
                name: "Text",
            },
        };
    }

    public render() {
        const {
            className,
            close,
            schema,
            visible,
        } = this.props;
        const { columns, draftColumnLabel, draftColumnType } = this.state;
        console.log(columns)
        return (
            <Modal
                width="90%"
                className={className}
                title={schema ? "Edit Schema" : "New Schema"}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={close}
            >
                {columns.map((column, i) => (
                    <div className={styles.columnRow} key={column.label}>
                        <div className={styles.columnName}>{column.label}</div>
                        <div className={styles.columnType}>{column.type}</div>
                        <Button shape="circle" icon="delete" onClick={this.removeColumn(i)}/>
                    </div>
                ))}
                <div className={styles.columnForm}>
                    <LabeledInput
                        className={styles.columnName}
                        required={true}
                        placeholder="Column Name"
                        label="Column Name"
                        onChange={this.setColumnLabel}
                        onPressEnter={this.addColumn}
                        value={draftColumnLabel}
                    />
                    <LabKeyOptionSelector
                        style={{flex: 1, marginRight: "1em"}}
                        className={styles.columnType}
                        required={true}
                        label="Column Type"
                        optionIdKey="id"
                        optionNameKey="name"
                        selected={draftColumnType}
                        onOptionSelection={this.setColumnType}
                        placeholder="Column Type"
                        options={COLUMN_TYPE_OPTIONS}
                    />
                    <Button icon="plus" shape="circle" type="primary" onClick={this.addColumn}/>
                </div>
            </Modal>
        );
    }

    private saveAndClose = () => {
        // this.props.createSchema(this.state.draft);
        this.props.close();
    }

    private setColumnLabel = (event: ChangeEvent<HTMLInputElement>) => {
        this.setState({
            draftColumnLabel: event.target.value,
        });
    }

    private setColumnType = (selectedOption: ColumnTypeOption | null) => {
        this.setState({
            draftColumnType: selectedOption || undefined,
        });
    }

    private addColumn = () => {
        const { columns, draftColumnLabel: label, draftColumnType: type } = this.state;
        if (label && type) {
            this.setState({
                columns: [...columns, {label, type: type.id}],
                draftColumnLabel: undefined,
                draftColumnType: DEFAULT_COLUMN_TYPE,
            });
        }
    }

    private removeColumn = (index: number) => {
        return () => {
            const columns = [...this.state.columns];
            columns.splice(index, 1);
            this.setState({ columns });
        };
    }
}

export default SchemaEditorModal;
