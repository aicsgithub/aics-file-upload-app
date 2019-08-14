import { InputNumber, Select } from "antd";
import Logger from "js-logger";
import * as React from "react";
import { editors } from "react-data-grid";

import { ChangeEvent } from "react";
import { ColumnType } from "../../../state/setting/types";

const styles = require("./styles.pcss");

const { Option } = Select;

interface EditorState {
    value?: any;
}

/*
    This is the editor for the UploadJobGrid, the purpose of this is to dynamically determine the editor based on
    which `type` the Editor is supplied and use that to render an appropriate form.
    Note that the field `input` and the methods `getValue` & `getInputNode` are required and used by the React-Data-Grid
 */
class Editor extends editors.EditorBase<AdazzleReactDataGrid.EditorBaseProps, EditorState> {
    // This ref is here so that the DataGrid doesn't throw a fit, normally it would use this to .focus() the input
    public input = React.createRef<HTMLDivElement>();

    constructor(props: AdazzleReactDataGrid.EditorBaseProps) {
        super(props);
        this.state = {
            value: this.props.value,
        };
    }

    public render() {
        // @ts-ignore Type IS something I am allowed to include in the column object this receives
        const { column: { dropdownValues, type }, height, width } = this.props;
        const { value } = this.state;

        let input;
        switch (type) {
            case ColumnType.DROPDOWN:
                input = (
                    <Select
                        allowClear={true}
                        autoFocus={true}
                        onChange={this.handleOnChange}
                        style={{ width: "100%" }}
                    >
                        {dropdownValues.map((dropdownValue: string) => (
                            <Option key={dropdownValue}>{dropdownValue}</Option>
                        ))}
                    </Select>
                );
                break;
            case ColumnType.BOOLEAN:
                input = (
                    <div
                        className={value ? styles.true : styles.false}
                        onClick={this.toggleBoolValue}
                        style={{ height, width }}
                    >
                        {value ? "Yes" : "No"}
                    </div>
                );
                break;
            case ColumnType.NUMBER:
                input = (
                    <InputNumber
                        autoFocus={true}
                        onChange={this.handleOnChange}
                        type="number"
                        style={{ width: "100%" }}
                        value={this.state.value}
                    />
                );
                break;
            case ColumnType.DATE:
                input = (
                    <input
                        autoFocus={true}
                        className={styles.dateMinWidth}
                        onChange={this.handleInputOnChange}
                        type="date"
                        value={this.state.value || undefined}
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
                        value={this.state.value || undefined}
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

    private toggleBoolValue = () => {
        this.setState({ value: !this.state.value });
    }

    private handleInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
        this.setState({ value: e.target.value });
    }

    private handleOnChange = (value: any) => {
        this.setState({ value });
    }
}

export default Editor;
