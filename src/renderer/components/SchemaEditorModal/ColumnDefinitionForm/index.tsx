import { Checkbox, Select } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";

import { ColumnType } from "../../../state/setting/types";
import EditableText from "../../EditableText";
import FormControl from "../../FormControl";

const styles = require("./styles.pcss");
const Option = Select.Option;

export interface ColumnDefinitionError {
    columnLabel?: string;
    columnType?: string;
}

interface Props {
    className?: string;
    columnLabel?: string;
    columnType?: ColumnType;
    dropdownValues?: string[];
    error?: ColumnDefinitionError;
    isEditing: boolean;
    required: boolean;
    setColumnLabel: (label?: string) => void;
    setColumnType: (selectedOption: ColumnType) => void;
    setDropdownValues: (selectOption: string[]) => void;
    setIsEditing: (isEditing: boolean) => void;
    setRequired: (e: CheckboxChangeEvent) => void;
}

/**
 * Form used to define a column in a schema
 */
class ColumnDefinitionForm extends React.Component<Props, {}> {
    public render() {
        const {
            className,
            columnLabel,
            columnType,
            dropdownValues,
            error,
            isEditing,
            required,
            setColumnLabel,
            setColumnType,
            setDropdownValues,
            setIsEditing,
            setRequired,
        } = this.props;

        return (
            <div className={classNames(styles.columnForm, className)}>
                <EditableText
                    className={styles.columnName}
                    value={columnLabel}
                    onBlur={setColumnLabel}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    error={error ? error.columnLabel : undefined}
                />
                <FormControl
                    className={styles.columnType}
                    error={error ? error.columnType : undefined}
                >
                    <div className={styles.columnTypeBody}>
                        <Select
                            className={styles.columnTypeSelect}
                            value={columnType}
                            onChange={setColumnType}
                            placeholder="Column Type"
                            defaultValue={ColumnType.TEXT}
                        >
                            {map(ColumnType, (display: string, key: ColumnType) => (
                                <Option value={key} key={key}>{display}</Option>
                            ))}
                        </Select>
                        {
                            columnType === ColumnType.DROPDOWN && (
                                <Select
                                    value={dropdownValues}
                                    className={styles.dropdownValuesSelect}
                                    mode="tags"
                                    placeholder="Dropdown values"
                                    onChange={setDropdownValues}
                                />
                            )
                        }
                    </div>
                </FormControl>
                <Checkbox onChange={setRequired} className={styles.required} value={required}/>
            </div>
        );
    }
}

export default ColumnDefinitionForm;
