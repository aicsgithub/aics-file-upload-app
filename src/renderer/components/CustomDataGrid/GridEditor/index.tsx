import { InputNumber, Select } from "antd";
import Logger from "js-logger";
import * as React from "react";
import { editors } from "react-data-grid";
import { ColumnType } from "../../../state/template/types";

import BooleanFormatter from "../../BooleanHandler/BooleanFormatter";

const styles = require("./styles.pcss");

const { Option } = Select;

interface EditorColumn extends AdazzleReactDataGrid.ExcelColumn {
    dropdownValues?: string[];
    type?: ColumnType;
}

interface EditorProps extends AdazzleReactDataGrid.EditorBaseProps {
    column: EditorColumn;
    width?: string;
}

interface EditorState {
    value?: any;
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

    constructor(props: AdazzleReactDataGrid.EditorBaseProps) {
        super(props);
        this.state = {
            // When the user starts typing into a cell with a numeric input the value
            // that they start typing with is sent as a prop to this component, however then the component
            // registers the same key being pressed twice leading to a a double entry ex. '4' -> '44', '1' -> '11'
            value: this.props.column.type === ColumnType.NUMBER ? null : props.value,
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
                input = (
                    <InputNumber
                        autoFocus={true}
                        onChange={this.handleOnChange}
                        type="number"
                        style={{ width: "100%" }}
                        value={value}
                    />
                );
                break;
            // TODO: Make Date & DateTime use either better style or a better component for date selection
            // Here I am using the input date element because the components I tried thus far did not register
            // a change of input before the focus changed back to the formatter thereby losing the selection
            // - Sean M 8/14/19
            case ColumnType.DATE:
                input = (
                    <input
                        autoFocus={true}
                        className={styles.dateMinWidth}
                        onChange={this.handleInputOnChange}
                        type="date"
                        value={value || undefined}
                    />
                );
                break;
            case ColumnType.DATETIME:
                input = (
                    <input
                        autoFocus={true}
                        className={styles.dateTimeMinWidth}
                        onChange={this.handleInputOnChange}
                        type="datetime-local"
                        value={value || undefined}
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
        return { [this.props.column.key]: this.state.value };
    }

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }

    private handleInputOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ value: e.target.value });
    }

    private handleOnChange = (value: any) => {
        this.setState({ value });
    }
}

export default Editor;
