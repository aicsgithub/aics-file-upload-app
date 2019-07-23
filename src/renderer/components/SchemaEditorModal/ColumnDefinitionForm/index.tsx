import { Checkbox, Icon, Select } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import * as classNames from "classnames";
import * as React from "react";
import { ColumnType } from "../../../state/setting/types";
import EditableText from "../../EditableText";

const styles = require("./styles.pcss");
const Option = Select.Option;

interface Props {
    className?: string;
    columnLabel?: string;
    columnType?: ColumnType;
    isEditing: boolean;
    required: boolean;
    setColumnLabel: (label?: string) => void;
    setColumnType: (selectedOption: ColumnType) => void;
    setIsEditing: (isEditing: boolean) => void;
    setRequired: (e: CheckboxChangeEvent) => void;
}

class ColumnDefinitionForm extends React.Component<Props, {}> {
    public render() {
        const {
            className,
            columnLabel,
            columnType,
            isEditing,
            required,
            setColumnLabel,
            setColumnType,
            setIsEditing,
            setRequired,
        } = this.props;

        return (
            <div className={classNames(styles.columnForm, className)}>
                <Icon className={styles.dragIcon} type="more"/>
                <EditableText
                    className={styles.columnName}
                    value={columnLabel}
                    onBlur={setColumnLabel}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                />
                <Select
                    className={styles.columnType}
                    value={columnType}
                    onChange={setColumnType}
                    placeholder="Column Type"
                    defaultValue={ColumnType.TEXT}
                >
                    <Option value={ColumnType.TEXT}>Text</Option>
                    <Option value={ColumnType.BOOLEAN}>Yes/No</Option>
                    <Option value={ColumnType.NUMBER}>Number</Option>
                    <Option value={ColumnType.DATE}>Date</Option>
                </Select>
                <Checkbox onChange={setRequired} className={styles.required} value={required}/>
            </div>
        );
    }
}

export default ColumnDefinitionForm;
