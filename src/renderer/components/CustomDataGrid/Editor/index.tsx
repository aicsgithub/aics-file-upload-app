import { Input, Select } from "antd";
import Logger from "js-logger";
import { trim } from "lodash";
import * as React from "react";
import { editors } from "react-data-grid";
import { LIST_DELIMITER_JOIN, LIST_DELIMITER_SPLIT } from "../../../constants";
import LookupSearch from "../../../containers/LookupSearch";

import { ColumnType } from "../../../state/template/types";
import { convertToArray } from "../../../util";
import BooleanFormatter from "../../BooleanFormatter";

const { Option } = Select;

interface EditorColumn extends AdazzleReactDataGrid.ExcelColumn {
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

    public constructor(props: EditorProps) {
        super(props);
        let value = props.value;
        switch (props.column.type) {
            case ColumnType.TEXT:
            case ColumnType.NUMBER:
                value = convertToArray(value).join(LIST_DELIMITER_JOIN);
                break;
            case ColumnType.BOOLEAN:
                if (value.length === 0) {
                    value = [true];
                } else {
                    // For bools, we want to automatically toggle the value when the
                    // user double clicks to edit it.
                    value[0] = !value[0];
                }
                break;
        }
        this.state = {
            value,
        };
    }

    public render() {
        const { column: { dropdownValues, type } } = this.props;
        const { value } = this.state;

        let input;
        switch (type) {
            case ColumnType.DROPDOWN:
                input = (
                    <Select
                        allowClear={true}
                        autoFocus={true}
                        defaultOpen={true}
                        mode="multiple"
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
                    <div onClick={() => this.handleOnChange([!value[0]])}>
                        <BooleanFormatter value={value} />
                    </div>
                );
                break;
            case ColumnType.NUMBER:
                input = (
                        <Input
                            autoFocus={true}
                            onChange={this.handleInputOnChange}
                            style={{ width: "100%" }}
                            value={this.state.value}
                        />
                    );
                break;
            case ColumnType.TEXT:
                input = (
                    <Input
                        autoFocus={true}
                        onChange={this.handleInputOnChange}
                        style={{ width: "100%" }}
                        value={this.state.value}
                    />
                );
                break;
            case ColumnType.LOOKUP:
                input = (
                    <LookupSearch
                        defaultOpen={true}
                        mode="multiple"
                        lookupAnnotationName={this.props.column.key}
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
        const { value } = this.state;
        const { column: { key, type } } = this.props;

        if (type === ColumnType.TEXT || type === ColumnType.NUMBER) {
            let formattedString = trim(value);
            if (value.endsWith(LIST_DELIMITER_SPLIT)) {
                formattedString = value.substring(0, value.length - 1);
            }
            return { [key]: formattedString };
        }

        return { [key]: value };
    }

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }

    private handleInputOnChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({value: e.target.value})

    private handleOnChange = (value: any) => {
        this.setState({ value });
    }
}

export default Editor;
