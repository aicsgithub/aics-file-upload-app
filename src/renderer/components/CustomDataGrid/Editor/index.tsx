import { DatePicker, Input, InputNumber, Select } from "antd";
import Logger from "js-logger";
import { noop } from "lodash";
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
    onChange?: (value: any, key: keyof UploadMetadata, row: UploadJobTableRow) => void;
    type?: ColumnType;
}

interface EditorProps extends AdazzleReactDataGrid.EditorBaseProps {
    column: EditorColumn;
    width?: string;
}

interface EditorState {
    searchValue?: string;
    searchResults: string[];
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
        this.state = {
            searchResults: [],
            searchValue: undefined,
        };
    }

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
                const useSearch = dropdownValues && dropdownValues.length > 20;
                const options: string[] = useSearch ?
                    this.state.searchResults : (dropdownValues || []);
                console.log("useSearch", useSearch)
                console.log("value", this.state.searchValue || value)
                input = (
                    <Select
                        allowClear={true}
                        autoFocus={true}
                        defaultOpen={true}
                        loading={!dropdownValues || !dropdownValues.length}
                        mode={allowMultipleValues ? "multiple" : "default"}
                        notFoundContent={useSearch ? "Try searching" : "No Results"}
                        onChange={this.handleOnChange}
                        onBlur={this.props.onCommit}
                        onSearch={useSearch ? this.onSearch : noop}
                        placeholder="Column Values"
                        showSearch={true}
                        style={{ width: "100%" }}
                        value={this.state.searchValue || value}
                    >
                        {options.map((dropdownValue: string) => (
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
        console.log("on change")
        const { column: { key, onChange }, rowData } = this.props;
        this.setState({searchResults: [], searchValue: undefined});

        if (onChange) {
            onChange(value, key, rowData);
        }
    }

    private onSearch = (value: string) => {
        console.log("on search", value);
        const allValues = this.props.column.dropdownValues || [];
        console.log(allValues.filter((v: string) => v.includes(value)));
        this.setState({
            searchResults: allValues.filter((v: string) => v.includes(value)),
            searchValue: value,
        });
    }
}

export default Editor;
