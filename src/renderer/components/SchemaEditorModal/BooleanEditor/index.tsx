import classNames from "classnames";
import * as React from "react";
import { editors } from "react-data-grid";

const styles = require("../styles.pcss");

interface Props extends AdazzleReactDataGrid.EditorBaseProps {
    value: boolean;
}

interface BooleanEditorState {
    checked: boolean;
}

// This is for use in ReactDataGrid for displaying a checkbox
class BooleanEditor extends editors.EditorBase<Props, BooleanEditorState> {
    // This ref is here so that the DataGrid doesn't throw a fit, normally it would use this to .focus() the input
    public input = React.createRef<HTMLDivElement>();

    constructor(props: Props) {
        super(props);
        this.state = {
            checked: props.value,
        };
    }

    public componentDidUpdate(prevProps: Readonly<Props & AdazzleReactDataGrid.EditorBaseProps>,
                              prevState: Readonly<BooleanEditorState>): void {
        if (prevState.checked !== this.state.checked) {
            setTimeout(this.props.onCommit, 500);
        }
    }

    public render() {
        return (
            <div
                className={classNames(styles.required, this.state.checked ? styles.true : styles.false)}
                onClick={this.toggleValue}
                ref={this.input}
                style={{ height: this.props.height, width: this.props.column.width }}
            >
                {this.state.checked ? "True" : "False"}
            </div>
        );
    }

    public getValue = () => ({[this.props.column.key]: this.state.checked});

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }

    private toggleValue = () => {
        this.setState({checked: !this.state.checked});
    }
}

export default BooleanEditor;
