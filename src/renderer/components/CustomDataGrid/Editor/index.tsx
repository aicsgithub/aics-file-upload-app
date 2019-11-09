import { DatePicker, Input, InputNumber, Select } from "antd";
import Logger from "js-logger";
import * as moment from "moment";
import * as React from "react";
import { editors } from "react-data-grid";
import { DATE_FORMAT, DATETIME_FORMAT } from "../../../constants";

import { ColumnType } from "../../../state/template/types";
import { UploadJobTableRow, UploadMetadata } from "../../../state/upload/types";
import BooleanFormatter from "../../BooleanHandler/BooleanFormatter";

const { Option } = Select;

interface EditorColumn extends AdazzleReactDataGrid.ExcelColumn {
    allowMultipleValues?: boolean;
    dropdownValues?: string[];
    onChange?: (value: any, key: keyof UploadMetadata, row: UploadJobTableRow,
                type?: ColumnType, allowMultipleValues?: boolean) => void;
    type?: ColumnType;
}

interface EditorProps extends AdazzleReactDataGrid.EditorBaseProps {
    column: EditorColumn;
    width?: string;
}

/*
    This is the editor for the UploadJobGrid, the purpose of this is to dynamically determine the editor based on
    which `type` the Editor is supplied and use that to render an appropriate form.
    Note that the field `input` and the methods `getValue` & `getInputNode` are required and used by the React-Data-Grid
    additionally, the element you return must contain an Input element
 */
class Editor extends editors.EditorBase<EditorProps, {}> {
    // This ref is here so that the DataGrid doesn't throw a fit, normally it would use this to .focus() the input
    public input = React.createRef<HTMLDivElement>();

    public render() {
        const { column: { allowMultipleValues, dropdownValues, type }, value } = this.props;

        let input;
        switch (type) {
            case ColumnType.DROPDOWN:
                input = (
                    <Select
                        allowClear={true}
                        autoFocus={true}
                        defaultOpen={true}
                        mode={allowMultipleValues ? "multiple" : "default"}
                        onChange={this.handleOnChange}
                        style={{ width: "100%" }}
                        value={value}
                    >
                        {dropdownValues && dropdownValues.map((dropdownValue: string) => (
                            <Option key={dropdownValue}>{dropdownValue}</Option>
                        ))}
                    </Select>
                );
                break;
            case ColumnType.BOOLEAN:
                input = (
                    <BooleanFormatter
                        saveValue={this.handleOnChange}
                        value={value}
                    />
                );
                break;
            case ColumnType.NUMBER:
                input = allowMultipleValues ?
                    (
                        <Input
                            autoFocus={true}
                            onChange={this.handleInputOnChange}
                            style={{ width: "100%" }}
                            value={value}
                        />
                    )
                    :
                    (
                        <InputNumber
                            autoFocus={true}
                            onChange={this.handleOnChange}
                            style={{ width: "100%" }}
                            value={value}
                        />
                    );
                break;
            case ColumnType.TEXT:
                input = (
                    <Input
                        autoFocus={true}
                        onChange={this.handleInputOnChange}
                        style={{ width: "100%" }}
                        value={value}
                    />
                );
                break;
            case ColumnType.DATE:
            case ColumnType.DATETIME:
                input = allowMultipleValues ? null : (
                  <DatePicker
                    autoFocus={true}
                    format={type === ColumnType.DATETIME ? DATETIME_FORMAT : DATE_FORMAT}
                    onChange={this.handleOnChange}
                    value={value ? moment(value) : undefined}
                    showTime={type === ColumnType.DATETIME}
                    style={{ width: "100%" }}
                  />
                );
                break;
            case ColumnType.LOOKUP:
                input = (
                    <Select
                        allowClear={true}
                        autoFocus={true}
                        defaultOpen={true}
                        loading={!dropdownValues || !dropdownValues.length}
                        mode={allowMultipleValues ? "multiple" : "default"}
                        onChange={this.handleOnChange}
                        onBlur={this.props.onCommit}
                        placeholder="Column Values"
                        showSearch={true}
                        style={{ width: "100%" }}
                        value={value}
                    >
                        {dropdownValues && dropdownValues.map((dropdownValue: string) => (
                            <Option key={dropdownValue} value={dropdownValue}>{dropdownValue}</Option>
                        ))}
                    </Select>
                );
                break;
            default:
                Logger.error("Invalid column type supplied");
                input = "ERROR";
        }
        return (
            <div ref={this.input}>
                {input}
            </div>
        );
    }

    // Should return an object of key/value pairs to be merged back to the row
    public getValue = () => {
        return { [this.props.column.key]: this.props.value };
    }

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }

    private handleInputOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        this.handleOnChange(value);
    }

    private handleOnChange = (value: any) => {
        const { column: { allowMultipleValues, key, type, onChange }, rowData } = this.props;

        let formattedValue = value;
        if (type === ColumnType.NUMBER && value) {
            // Remove anything that isn't a number, comma, or whitespace
            formattedValue = value.replace(/[^0-9,\s]/g, "");
        }

        if (onChange) {
            onChange(formattedValue, key, rowData, type, allowMultipleValues);
        }
    }
}

export default Editor;
