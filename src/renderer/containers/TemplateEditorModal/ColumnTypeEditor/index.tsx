import { Select } from "antd";
import * as classNames from "classnames";
import * as React from "react";
import { editors } from "react-data-grid";

import {
    AnnotationDraft,
    AnnotationType,
    AnnotationTypeDraft,
    ColumnType,
    Lookup,
} from "../../../state/template/types";

const styles = require("./styles.pcss");

const { Option } = Select;

interface Props extends AdazzleReactDataGrid.EditorBaseProps {
    annotationTypes: AnnotationType[];
    className?: string;
    column: AdazzleReactDataGrid.ExcelColumn;
    tables: Lookup[];
    value: AnnotationTypeDraft;
}

interface ColumnTypeEditorState {
    newDropdownValues?: string[];
    newLookup?: string;
    newType: string;
}

interface SelectorTarget extends EventTarget {
    value?: string;
}

// Needed to convince typescript that the event target will have a value
interface TabEvent extends React.KeyboardEvent<HTMLInputElement> {
    target: SelectorTarget;
}

// This component is for use in the ReactDataGrid component for editing column type.
// If the user selects dropdown as a column type, they will also be able to define
// the dropdown values.
class ColumnTypeEditor extends editors.EditorBase<Props, ColumnTypeEditorState> {
    public input = React.createRef<HTMLDivElement>();
    // We need an input to focus on when TAB is pressed to keep the editor engaged, we are not able to focus
    // on the actual selector we use in the dropdown unfortunately
    private hiddenDropdownRef = React.createRef<HTMLInputElement>();

    constructor(props: Props) {
        super(props);
        this.state = {
            newDropdownValues: props.value.annotationOptions || [],
            newLookup: props.value.lookupTable,
            newType: props.value.name,
        };
    }

    // If the type changes to something that doesn't need more input we want to exit the editor
    public componentDidUpdate(prevProps: Readonly<Props & AdazzleReactDataGrid.EditorBaseProps>,
                              prevState: Readonly<ColumnTypeEditorState>): void {
        const { newType } = this.state;
        const typeChanged = prevState.newType !== newType;
        const typeIsNotDropdownOrLookup = newType !== ColumnType.DROPDOWN && newType !== ColumnType.LOOKUP;
        if (typeChanged && typeIsNotDropdownOrLookup) {
            this.props.onCommit();
        }
    }

    public render() {
        const {className, annotationTypes} = this.props;
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
                    {annotationTypes.map((at: AnnotationType) => (
                        <Select.Option key={at.name} value={at.name}>
                            {at.name}
                        </Select.Option>
                    ))}
                </Select>
                {this.renderAdditionalInputForType()}
            </div>
        );
    }

    public renderAdditionalInputForType = (): React.ReactNode => {
        if (this.state.newType === ColumnType.DROPDOWN) {
            return (
                <>
                    <input
                        className={styles.hiddenDropdown}
                        readOnly={true}
                        ref={this.hiddenDropdownRef}
                        type="text"
                    />
                    <Select
                        autoFocus={true}
                        className={styles.dropdownValuesSelect}
                        mode="tags"
                        onChange={this.setDropdownValues}
                        onInputKeyDown={this.onDropdownValuesKeydown}
                        placeholder="Dropdown values"
                        value={this.state.newDropdownValues}
                    />
                </>);
        }
        if (this.state.newType === ColumnType.LOOKUP) {
            const { tables } = this.props;
            return (
                <>
                    <Select
                        autoFocus={!this.state.newLookup}
                        className={styles.dropdownValuesSelect}
                        defaultOpen={!this.state.newLookup}
                        loading={!tables}
                        onChange={this.setLookup}
                        placeholder="Tables"
                        showSearch={true}
                        value={this.state.newLookup}
                    >
                        {tables && tables.map((t) => t.tableName).sort().map((table: string) => (
                            <Option key={table} value={table}>{table}</Option>
                        ))}
                    </Select>
                </>
            );
        }
        return null;
    }

    public getValue = (): Partial<AnnotationDraft> => {
        // should return an object of key/value pairs to be merged back to the row
        const { annotationTypes, tables } = this.props;
        const { newLookup, newType } = this.state;
        const annotationTypeSelected = annotationTypes.find((at) => at.name === newType);
        const lookupSelected = tables.find((t) => t.tableName === newLookup);
        return {
            [this.props.column.key]: {
                type: {
                    ...annotationTypeSelected,
                    annotationOptions: this.state.newDropdownValues,
                    lookupColumn: lookupSelected ? lookupSelected.columnName : undefined,
                    lookupSchema: lookupSelected ? lookupSelected.schemaName : undefined,
                    lookupTable: newLookup,
                },
            },
        };
    }

    public getInputNode = (): Element | Text | null => {
        console.log("test")
        return this.input.current;
    }

    private setDropdownValues = (selectOption: string[]) => {
        this.setState({newDropdownValues: selectOption});
    }

    private setLookup = (value: string) => {
        this.setState({ newLookup: value });
    }

    private setColumnType = (newType: string) => {
        const columnTypeIsDropdown = newType === ColumnType.DROPDOWN;
        this.setState({
            newDropdownValues: columnTypeIsDropdown ? [] : undefined,
            newLookup: undefined,
            newType,
        });
    }

    private onDropdownValuesKeydown = (e: TabEvent) => {
        // We need to have some custom logic to get the dropdown to save the input on tab and remain editing
        if (e.key === "Tab" && e.type === "keydown" && this.state.newDropdownValues) {
            const newValue = e.target.value;
            // We don't want to stop propagation if there is no new value because that way we can move to the next cell
            if (newValue && !this.state.newDropdownValues.includes(newValue)) {
                e.stopPropagation(); // Needed to get value to save
                this.hiddenDropdownRef.current!.focus();
                this.setState({ newDropdownValues: [...this.state.newDropdownValues, newValue]});
            }
        } else {
            e.stopPropagation(); // Needed allow Select to save values on Enter
        }
    }
}

export default ColumnTypeEditor;
