import * as React from "react";
import { editors } from "react-data-grid";
import BooleanFormatter from "../BooleanFormatter";

interface BooleanEditorState {
    newValue: boolean;
}

/*
    This is an editor wrapper for the BooleanFormatter, ReactDataGrid requires certain attributes for Editors
    so this contains those and returns the formatter
 */
class BooleanEditor extends editors.EditorBase<AdazzleReactDataGrid.EditorBaseProps, BooleanEditorState> {
    public input = React.createRef<HTMLDivElement>();

    public constructor(props: AdazzleReactDataGrid.EditorBaseProps) {
        super(props);
        this.state = {
            newValue: false,
        }
    }

    public render() {
        return (
            <div ref={this.input}>
                <BooleanFormatter
                    saveValue={this.saveValue}
                    value={this.state.newValue}
                />
            </div>
        );
    }

    public saveValue = (newValue: boolean) => {
        this.setState({ newValue });
    }

    // Returns object of key/value pairs to be merged back to the row
    public getValue = () => {
        return {
            [this.props.column.key]: this.props.value,
        };
    }

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }
}

export default BooleanEditor;
