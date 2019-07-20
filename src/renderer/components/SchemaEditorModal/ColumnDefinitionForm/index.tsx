import { Select } from "antd";
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
    onClick: () => void;
    setColumnLabel: (label?: string) => void;
    setColumnType: (selectedOption: ColumnType) => void;
}

const ColumnDefinitionForm: React.FunctionComponent<Props> = ({
    className,
    columnLabel,
    columnType,
    onClick,
    setColumnLabel,
    setColumnType,
}: Props) => {

    return (
        <div className={classNames(styles.columnForm, className)} onClick={onClick}>
            <EditableText
                className={styles.columnName}
                value={columnLabel}
                onBlur={setColumnLabel}
                placeholder="Column Name"
                isEditing={true}
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
        </div>
    );
};

export default ColumnDefinitionForm;
