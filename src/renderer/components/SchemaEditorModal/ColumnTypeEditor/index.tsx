import { Select } from "antd";
import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { editors } from "react-data-grid";

import { DatabaseMetadata } from "../../../state/metadata/types";
import { ColumnType } from "../../../state/setting/types";

import { COLUMN_TYPE_DISPLAY_MAP, ColumnTypeValue } from "../";

const styles = require("./styles.pcss");

const { Option } = Select;

interface EditorColumn extends AdazzleReactDataGrid.ExcelColumn {
    tables?: DatabaseMetadata;
}

interface Props extends AdazzleReactDataGrid.EditorBaseProps {
    className?: string;
    column: EditorColumn;
    value: ColumnTypeValue;
}

interface ColumnTypeEditorState {
    newColumn?: string;
    newType?: ColumnType;
    newDropdownValues?: string[];
    newTable?: string;
}

// This component is for use in the ReactDataGrid component for editing column type.
// If the user selects dropdown as a column type, they will also be able to define
// the dropdown values.
class ColumnTypeEditor extends editors.EditorBase<Props, ColumnTypeEditorState> {
    public input = React.createRef<HTMLDivElement>();

    constructor(props: Props) {
        super(props);
        this.state = {
            newColumn: props.value ? props.value.column : undefined,
            newDropdownValues: props.value ? props.value.dropdownValues : [],
            newTable: props.value ? props.value.table : undefined,
            newType: props.value ? props.value.type : undefined,
        };
    }

    public componentDidUpdate(prevProps: Readonly<Props & AdazzleReactDataGrid.EditorBaseProps>,
                              prevState: Readonly<ColumnTypeEditorState>): void {
        const typeChanged = prevState.newType !== this.state.newType;
        const typeIsNotDropdown = this.state.newType !== ColumnType.DROPDOWN;
        if ((typeChanged && typeIsNotDropdown)) {
            this.props.onCommit();
        }
    }

    public render() {
        const {className} = this.props;
        const {newType} = this.state;

        return (
            <div
                className={classNames(className, styles.container)}
                ref={this.input}
            >
                <Select
                    autoFocus={true}
                    className={styles.columnTypeSelect}
                    onChange={this.setColumnType}
                    placeholder="Column Type"
                    value={`${newType}`}
                >
                    {map(COLUMN_TYPE_DISPLAY_MAP, (display: string, key: ColumnType) => (
                        <Option value={key} key={key}>{display}</Option>
                    ))}
                </Select>
                {this.renderAdditionalInputForType()}
            </div>
        );
    }

    public renderAdditionalInputForType = (): React.ReactElement | null => {
        const { tables } = this.props.column;

        if (this.state.newType === ColumnType.DROPDOWN) {
            return (
                <Select
                    value={this.state.newDropdownValues}
                    className={styles.dropdownValuesSelect}
                    mode="tags"
                    placeholder="Dropdown values"
                    onChange={this.setDropdownValues}
                    onBlur={this.props.onCommit}
                    onInputKeyDown={this.onDropdownValuesKeydown}
                />);
        }
        if (this.state.newType === ColumnType.LOOKUP) {
            return (
                <>
                    <Select
                        className={styles.dropdownValuesSelect}
                        loading={!tables}
                        onChange={this.setTable}
                        placeholder="Tables"
                        showSearch={true}
                        value={this.state.newTable}
                    >
                        {tables && Object.keys(tables).sort().map((table: string) => (
                            <Option key={table} value={table}>{table}</Option>
                        ))}
                    </Select>
                    {this.state.newTable && <Select
                        className={styles.dropdownValuesSelect}
                        onChange={this.setColumn}
                        onBlur={this.props.onCommit}
                        placeholder="Columns"
                        showSearch={true}
                        value={this.state.newColumn}
                    >
                        {tables && tables[this.state.newTable].columns.map((column: string) => (
                            <Option key={column} value={column}>{column}</Option>
                        ))}
                    </Select>}
                </>
            );
        }
        return null;
    }

    public getValue = () => {
        // should return an object of key/value pairs to be merged back to the row
        return {
            [this.props.column.key]: {
                column: this.state.newColumn,
                dropdownValues: this.state.newDropdownValues,
                table: this.state.newTable,
                type: this.state.newType,
            },
        };
    }

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }

    private setDropdownValues = (selectOption: string[]) => {
        this.setState({newDropdownValues: selectOption});
    }

    private setTable = (value: string) => {
        this.setState({ newColumn: undefined, newTable: value });
    }

    private setColumn = (value: string) => {
        this.setState({ newColumn: value });
    }

    private setColumnType = (value: string) => {
        const newType = parseInt(value, 10) || ColumnType.TEXT;
        const columnTypeIsDropdown = newType === ColumnType.DROPDOWN;
        this.setState({newType, newDropdownValues: columnTypeIsDropdown ? [] : undefined});
    }

    private onDropdownValuesKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => e.stopPropagation();
}

export default ColumnTypeEditor;
