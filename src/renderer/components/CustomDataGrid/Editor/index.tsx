import { DatePicker, Input, InputNumber, Select } from "antd";
import Logger from "js-logger";
import * as moment from "moment";
import * as React from "react";
import { editors } from "react-data-grid";
import { DATE_FORMAT, DATETIME_FORMAT } from "../../../constants";
import LookupSearch from "../../../containers/LookupSearch";

import { ColumnType } from "../../../state/template/types";
import BooleanFormatter from "../../BooleanHandler/BooleanFormatter";

const { Option } = Select;

interface EditorColumn extends AdazzleReactDataGrid.ExcelColumn {
    allowMultipleValues?: boolean;
    dropdownValues?: string[];
    type?: ColumnType;
}

interface EditorProps extends AdazzleReactDataGrid.EditorBaseProps {
    column: EditorColumn;
}

interface EditorState {
    value: any;
}

/*
    This is the editor for the UploadJobGrid, the purpose of this is to dynamically determine the editor based on
    which `type` the Editor is supplied and use that to render an appropriate form.
    Note that the field `input` and the methods `getValue` & `getInputNode` are required and used by the React-Data-Grid
    additionally, the element you return must contain an Input element
 */
class Editor extends editors.EditorBase<EditorProps, EditorState> {
    // This ref is here so that the DataGrid doesn't throw a fit, normally it would use this to .focus() the input
    public input = React.createRef<HTMLDivElement>();

    constructor(props: EditorProps) {
        super(props);
        const { column, value } = props;
        const isColumnBoolean = column.type === ColumnType.BOOLEAN;
        this.state = {
            // For bools, we want to automatically toggle the value when the
            // user double clicks to edit it.
            value: isColumnBoolean ? !value : value,
        };
    }

    public render() {
        const {
            column: { allowMultipleValues, dropdownValues, type },
        } = this.props;

        const { value } = this.state;

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
                    <div onClick={() => this.handleOnChange(!value)}>
                        <BooleanFormatter value={value} />
                    </div>
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
                    <LookupSearch
                        defaultOpen={true}
                        key={this.props.column.key}
                        mode={allowMultipleValues ? "multiple" : "default"}
                        lookupAnnotationName={this.props.column.key}
                        onBlur={this.props.onCommit}
                        selectSearchValue={this.handleOnChange}
                        value={value}
                    />
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
        return { [this.props.column.key]: this.state.value };
    }

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }

    private handleInputOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        this.handleOnChange(value);
    }

    private handleOnChange = (value: any) => {
        this.setState({ value });
    }
}

export default Editor;
