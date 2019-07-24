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
    columnNames: string[];
    columnLabel?: string;
    columnType?: ColumnType;
    isEditing: boolean;
    required: boolean;
    setColumnLabel: (label?: string) => void;
    setColumnType: (selectedOption: ColumnType) => void;
    setDropdownValues: (selectOption: string[]) => void;
    setIsEditing: (isEditing: boolean) => void;
    setRequired: (e: CheckboxChangeEvent) => void;
}

class ColumnDefinitionForm extends React.Component<Props, {}> {
    public render() {
        const {
            className,
            columnLabel,
            columnNames,
            columnType,
            isEditing,
            required,
            setColumnLabel,
            setColumnType,
            setDropdownValues,
            setIsEditing,
            setRequired,
        } = this.props;

        const duplicateNameError = columnNames.filter((name) => name === columnLabel).length > 1;

        return (
            <div className={classNames(styles.columnForm, className)}>
                <Icon className={styles.dragIcon} type="more"/>
                <EditableText
                    className={styles.columnName}
                    value={columnLabel}
                    onBlur={setColumnLabel}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    error={duplicateNameError ? "Column label must be unique" : undefined}
                />
                <div className={styles.columnType}>
                    <Select
                        className={styles.columnTypeSelect}
                        value={columnType}
                        onChange={setColumnType}
                        placeholder="Column Type"
                        defaultValue={ColumnType.TEXT}
                    >
                        <Option value={ColumnType.TEXT}>Text</Option>
                        <Option value={ColumnType.DROPDOWN}>Dropdown</Option>
                        <Option value={ColumnType.BOOLEAN}>Yes/No</Option>
                        <Option value={ColumnType.NUMBER}>Number</Option>
                        <Option value={ColumnType.DATE}>Date</Option>
                        <Option value={ColumnType.DATETIME}>Date and Time</Option>
                    </Select>
                    {
                        columnType === ColumnType.DROPDOWN && (
                            <Select
                                className={styles.dropdownValuesSelect}
                                mode="tags"
                                placeholder="Dropdown values"
                                onChange={setDropdownValues}
                            />
                        )
                    }
                </div>
                <Checkbox onChange={setRequired} className={styles.required} value={required}/>
            </div>
        );
    }
}

export default ColumnDefinitionForm;
