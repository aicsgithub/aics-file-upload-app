import { LabKeyOptionSelector } from "@aics/aics-react-labkey";
import { Button, Input, Modal, Select } from "antd";
import { ChangeEvent } from "react";
import * as React from "react";
import { ActionCreator } from "redux";
import { ColumnDefinition, ColumnType, CreateSchemaAction } from "../../state/setting/types";

const Option = Select.Option;
const styles = require("./styles.pcss");
const DEFAULT_DRAFT = Object.freeze({
    label: undefined,
    type: ColumnType.TEXT,
});

interface ColumnTypeOption {
    name: string;
    id: ColumnType;
}

interface Props {
    className?: string;
    createSchema: ActionCreator<CreateSchemaAction>;
    close: () => void;
    visible: boolean;
}

interface CreateSchemaModalState {
    columns: ColumnDefinition[];
    draft: {
        label?: string;
        type?: ColumnType;
    };
}

class CreateSchemaModal extends React.Component<Props, CreateSchemaModalState> {
    public state: CreateSchemaModalState = {
        columns: [],
        draft: DEFAULT_DRAFT,
    };

    public render() {
        const {
            className,
            close,
            visible,
        } = this.props;
        const { columns } = this.state;
        return (
            <Modal
                width="90%"
                className={className}
                title="Create Schema"
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={close}
            >
                {columns.map((column) => (
                    <div className={styles.columnRow} key={column.label}>
                        <div className={styles.columnName}>{column.label}</div>
                        <div className={styles.columnType}>{column.type}</div>
                    </div>
                ))}
                <div className={styles.columnForm}>
                    <Input placeholder="Column Name" className={styles.columnName} onChange={this.setColumnLabel}/>
                    <LabKeyOptionSelector
                        required={true}
                        label="Column Type"
                        optionIdKey="id"
                        optionNameKey="name"
                        selected={this.state.draft.type}
                        onOptionSelection={this.setColumnType}
                        placeholder="Column Type"
                    />
                    <Select defaultValue={ColumnType.TEXT} className={styles.columnType} onChange={this.setColumnType}>
                        <Option value={ColumnType.TEXT}>Text</Option>
                        <Option value={ColumnType.BOOLEAN}>Yes/No</Option>
                        <Option value={ColumnType.NUMBER}>Number</Option>
                        <Option value={ColumnType.DATE}>Date/Time</Option>
                    </Select>
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
            draft: {
                ...this.state.draft,
                label: event.target.value,
            },
        });
    }

    private setColumnType = (selectedOption: ColumnTypeOption | null) => {
        this.setState({
            draft: {
                ...this.state.draft,
                type: selectedOption ? selectedOption.id : undefined,
            },
        });
    }

    private addColumn = () => {
        const { columns, draft } = this.state;
        if (draft.label !== undefined && !!draft.type) {
            this.setState({
                columns: [...columns, draft],
                draft: DEFAULT_DRAFT,
            });
        }
    }
}

export default CreateSchemaModal;
