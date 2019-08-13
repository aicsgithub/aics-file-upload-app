import {DatePicker, InputNumber, Select} from "antd";
import Logger from "js-logger";
import * as React from "react";
import { editors } from "react-data-grid";

import { ColumnType } from "../../../state/setting/types";
import {Moment} from "moment";
import ReactDOM from "react-dom";

const styles = require("./styles.pcss");

const { Option } = Select;

interface EditorState {
    value?: any;
}

// TODO: Docstring
class Editor extends editors.EditorBase<AdazzleReactDataGrid.EditorBaseProps, EditorState> {
    // TODO: Maybe actually use this ref?
    public input = React.createRef<HTMLDivElement>();

    constructor(props: AdazzleReactDataGrid.EditorBaseProps) {
        super(props);
        this.state = {
            value: this.props.value
        };
    }

    public render() {
        // @ts-ignore Type IS something I am allowed to include in the column object this receives
        const { column: { dropdownValues, type }, height, width } = this.props;
        const { value } = this.state;
        return (
            <div ref={this.input}>
                <input
                    onChange={this.onChange}
                    type="datetime-local"
                    value={this.state.value}
                />
            </div>);

        switch(type) {
            case ColumnType.DROPDOWN:
                return (
                    <div ref={this.input}>
                        <Select
                            allowClear={true}
                            // value={this.state.value}
                            onChange={this.handleOnChange}
                            style={{ width: "100%" }}
                        >
                            {dropdownValues.map((dropdownValue: string) => (
                                <Option key={dropdownValue}>{dropdownValue}</Option>
                            ))}
                        </Select>
                    </div>
                );
            case ColumnType.BOOLEAN:
                return (
                    <div>
                        <div
                            className={value ? styles.true : styles.false}
                            onClick={this.toggleBoolValue}
                            ref={this.input}
                            style={{ height, width }}
                        >
                            {value ? "Yes" : "No"}
                        </div>
                    </div>
                );
            case ColumnType.NUMBER:
                return (
                    <div ref={this.input}>
                        <InputNumber
                            onChange={this.handleOnChange}
                            type="number"
                            style={{ width }}
                            value={this.state.value}
                        />
                    </div>
                );
            case ColumnType.DATE:
                return (
                    <div ref={this.input}>
                        <DatePicker
                            onBlur={this.onBlur}
                            onOk={(time: Moment) => console.log(time)}
                            onChange={this.handleOnChange}
                            open={true}
                        />
                    </div>
                );
            case ColumnType.DATETIME:
                return (
                    <div ref={this.input}>
                        <DatePicker
                            onBlur={this.onBlur}
                            onChange={(time: Moment) => console.log(time)}
                            onOk={(time: Moment) => console.log(time)}
                            open={true}
                            showTime={true}
                        />
                    </div>
                );
            default:
                Logger.error("Invalid column type supplied");
                return (
                    <div className={styles.error} ref={this.input}>
                        ERROR
                    </div>
                );
        }
    }

    private onBlur = (e: any) => {
        e.preventDefault();
        console.log(e);
        console.log(e.target);
        console.log(e.target.value);
    }

    private toggleBoolValue = () => {
        this.setState({ value: !this.state.value })
    }

    private handleOnChange = (value: any) => {
        this.setState({ value });
    }

    // Should return an object of key/value pairs to be merged back to the row
    public getValue = () => {
        console.log(ReactDOM.findDOMNode(this)!.getElementsByTagName("input")[0]);
        console.log(ReactDOM.findDOMNode(this)!.getElementsByTagName("input")[0].value);
        return { [this.props.column.key]: this.state.value };
    }

    // public getInputNode = (): Element | Text | null => {
    //     return this.input.current;
    // }

    public getInputNode() {
        console.log(ReactDOM.findDOMNode(this)!.getElementsByTagName("input")[0]);
        console.log(ReactDOM.findDOMNode(this)!.getElementsByTagName("input")[0].value);
        return ReactDOM.findDOMNode(this)!.getElementsByTagName("input")[0];
    }
}

export default Editor;
