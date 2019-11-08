import { DatePicker, Input, InputNumber, Select } from "antd";
import Logger from "js-logger";
import { castArray, isNil, trim } from "lodash";
import * as moment from "moment";
import { ChangeEvent } from "react";
import * as React from "react";
import { editors } from "react-data-grid";
import { DATE_FORMAT, DATETIME_FORMAT } from "../../../constants";

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
    width?: string;
}

interface EditorState {
    text?: string; // this is for the number and string inputs if multiple values allowed
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
        this.state = this.getStateFromProps(props);
    }

    public componentDidUpdate(prevProps: EditorProps) {
        if (this.props.value !== prevProps.value) {
            this.setState(this.getStateFromProps(this.props));
        }
    }

    public render() {
        const { column: { allowMultipleValues, dropdownValues, type } } = this.props;
        const { text, value } = this.state;

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
                            onBlur={this.onBlur}
                            onChange={this.updateText}
                            style={{ width: "100%" }}
                            value={text}
                        />
                    )
                    :
                    (
                        <InputNumber
                            autoFocus={true}
                            onChange={this.onNumberInputChange}
                            style={{ width: "100%" }}
                            value={value}
                        />
                    );
                break;
            case ColumnType.TEXT:
                input = (
                    <Input
                        autoFocus={true}
                        onBlur={this.onBlur}
                        onChange={this.updateText}
                        style={{ width: "100%" }}
                        value={allowMultipleValues ? text : value}
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
                    value={moment(value)}
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
        return { [this.props.column.key]: this.state.value };
    }

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }

    private handleOnChange = (value: any) => {
        const { column: { type } } = this.props;

        // antd's DatePicker passes a moment object rather than Date so we convert back here
        if (type === ColumnType.DATETIME || type === ColumnType.DATE) {
            value = value instanceof Date || !value ? value : value.toDate();
        }
        this.setState({ value });
    }

    private onBlur = (e: ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const value = this.props.column.type === ColumnType.NUMBER ?
            this.parseNumberArray(rawValue) : this.parseStringArray(rawValue);
        this.setState({value});
    }

    private updateText = (e: ChangeEvent<HTMLInputElement>) => {
        this.setState({text: e.target.value});
    }

    private onNumberInputChange = (value?: number) => {
        this.setState({ value });
    }

    private parseStringArray = (rawValue?: string) => {
        if (!rawValue) {
            return undefined;
        }

        return rawValue.split(",").map(trim).filter((v) => !!v);
    }

    private parseNumberArray = (rawValue?: string) => {
        if (!rawValue) {
            return undefined;
        }

        return rawValue.split(",")
            .map(this.parseNumber)
            .filter((v: number) => !Number.isNaN(v));
    }

    // returns int if no decimals and float if not
    private parseNumber = (n: string) => {
        const trimmed = trim(n);
        let parsed = parseFloat(trimmed);

        // convert to int if no decimals
        if (parsed % 1 !== 0) {
            parsed = parseInt(trimmed, 10);
        }

        return parsed;
    }

    private stringifyList = (list?: any) => {
        const values = !isNil(list) ? castArray(list) : [];
        return values.join(", ");
    }

    private getStateFromProps = (props: EditorProps) => {
        const { column: { type } } = props;
        let value;
        let text;
        if (props.column.allowMultipleValues && (type === ColumnType.NUMBER || type === ColumnType.TEXT)) {
            text = this.stringifyList(props.value);
        } else {
            value = props.value;
            if (Array.isArray(value)) {
                value = value.length ? value[0] : undefined;
            }
        }

        return {
            text,
            value,
        };
    }
}

export default Editor;
