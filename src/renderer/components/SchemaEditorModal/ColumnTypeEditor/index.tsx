import { Select } from "antd";
import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { ChangeEvent } from "react";
import { editors } from "react-data-grid";

import { ColumnType } from "../../../state/setting/types";

import { COLUMN_TYPE_DISPLAY_MAP } from "../";

const styles = require("./styles.pcss");

interface Props extends AdazzleReactDataGrid.EditorBaseProps {
    className?: string;
    value: {
        type: ColumnType;
        dropdownValues: string[];
    };
}

interface ColumnTypeEditorState {
    newType?: ColumnType;
    newDropdownValues?: string[];
}

// This component is for use in the ReactDataGrid component for editing column type.
// If the user selects dropdown as a column type, they will also be able to define
// the dropdown values.
class ColumnTypeEditor extends editors.EditorBase<Props, ColumnTypeEditorState> {
    public input = React.createRef<HTMLSelectElement>();

    constructor(props: Props) {
        super(props);
        this.state = {
            newDropdownValues: props.value ? props.value.dropdownValues : [],
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
        const {newDropdownValues, newType} = this.state;

        return (
            <div
                className={classNames(className, styles.container)}
            >
                <select
                    className={styles.columnTypeSelect}
                    value={newType}
                    onChange={this.setColumnType}
                    placeholder="Column Type"
                    ref={this.input}
                >
                    {map(COLUMN_TYPE_DISPLAY_MAP, (display: string, key: ColumnType) => (
                        <option value={key} key={key}>{display}</option>
                    ))}
                </select>
                {newType === ColumnType.DROPDOWN && <Select
                    value={newDropdownValues}
                    className={styles.dropdownValuesSelect}
                    mode="tags"
                    placeholder="Dropdown values"
                    onChange={this.setDropdownValues}
                    onBlur={this.props.onCommit}
                    onInputKeyDown={this.onDropdownValuesKeydown}
                />}
            </div>
        );
    }

    public getValue = () => {
        // should return an object of key/value pairs to be merged back to the row
        return {
            [this.props.column.key]: {
                dropdownValues: this.state.newDropdownValues,
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

    private setColumnType = (e: ChangeEvent<HTMLSelectElement>) => {
        const newType = parseInt(e.target.value, 10) || ColumnType.TEXT;
        const columnTypeIsDropdown = newType === ColumnType.DROPDOWN;
        this.setState({newType, newDropdownValues: columnTypeIsDropdown ? [] : undefined});
    }

    private onDropdownValuesKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => e.stopPropagation();
}

export default ColumnTypeEditor;
