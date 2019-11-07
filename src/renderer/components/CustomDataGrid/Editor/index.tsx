import { DatePicker, Input, InputNumber, Select } from "antd";
import * as classNames from "classnames";
import { castArray, includes, isNil } from "lodash";
import * as moment from "moment";
import * as React from "react";

import { ColumnType } from "../../../state/template/types";
import BooleanFormatter from "../../BooleanHandler/BooleanFormatter";

const styles = require("./styles.pcss");

interface Props {
    allowMultipleValues?: boolean;
    className?: string;
    dropdownValues?: string[];
    onBlur?: () => void;
    onChange: (value: any) => void;
    onPressEnter?: () => void;
    type?: ColumnType;
    value?: any;
}

const getOnChange = (onChange: (value: any) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value);

const Editor: React.FunctionComponent<Props> = ({
    allowMultipleValues,
    className,
    dropdownValues,
    onBlur,
    onChange,
    onPressEnter,
    type,
    value,
}: Props) => {
    const selectMode = allowMultipleValues ? "multiple" : "default";
    onChange = includes([ColumnType.TEXT], type) ?
        getOnChange(onChange) : onChange;

    if (allowMultipleValues) {
        value = isNil(value) ? [] : castArray(value);
    }

    switch (type) {
        case ColumnType.DROPDOWN:
        case ColumnType.LOOKUP:
            return (
                <Select
                    allowClear={true}
                    autoFocus={true}
                    className={classNames(styles.input, className)}
                    defaultOpen={true}
                    loading={!dropdownValues || !dropdownValues.length}
                    onBlur={onBlur}
                    onChange={onChange}
                    mode={selectMode}
                    value={value}
                >
                    {dropdownValues && dropdownValues.map((o) => (
                        <Select.Option value={o} key={o}>{o}</Select.Option>
                    ))}
                </Select>
            );
        case ColumnType.NUMBER:
            return (
                <InputNumber
                    autoFocus={true}
                    className={classNames(styles.input, className)}
                    onChange={onChange}
                    type="number"
                    value={value}
                />
            );
        case ColumnType.DATE:
        case ColumnType.DATETIME:
            return (
                <DatePicker
                    autoFocus={true}
                    onChange={onChange}
                    value={moment(value)}
                    showTime={type === ColumnType.DATETIME}
                />
            );

        case ColumnType.BOOLEAN:
            return (
                <BooleanFormatter
                    className={classNames(styles.input, className)}
                    saveValue={onChange}
                    value={value}
                />
            );
        default:
            return (
                <Input
                    autoFocus={true}
                    className={classNames(styles.input, className)}
                    onChange={onChange}
                    onPressEnter={onPressEnter}
                    value={value}
                />
            );
    }
};

export default Editor;
