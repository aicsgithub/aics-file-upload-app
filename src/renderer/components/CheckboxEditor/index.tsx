import { Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import * as React from "react";
import { editors } from "react-data-grid";
import * as ReactDOM from "react-dom";

const styles = require("./styles.pcss");

interface Props extends AdazzleReactDataGrid.EditorBaseProps {
    value: boolean;
}

interface CheckboxEditorState {
    checked: boolean;
}

// This is for use in ReactDataGrid for displaying a checkbox
class CheckboxEditor extends editors.EditorBase<Props, CheckboxEditorState> {
    private input = React.createRef<Checkbox>();

    constructor(props: Props) {
        super(props);
        this.state = {
            checked: props.value,
        };
    }

    public componentDidUpdate(prevProps: Readonly<Props & AdazzleReactDataGrid.EditorBaseProps>,
                              prevState: Readonly<CheckboxEditorState>): void {
        if (prevState.checked !== this.state.checked) {
            setTimeout(this.props.onCommit, 500);
        }
    }

    public render() {
        const { checked } = this.state;

        return <Checkbox className={styles.checkbox} checked={checked} onChange={this.setChecked} ref={this.input}/>;
    }

    public getValue = () => ({[this.props.column.key]: this.state.checked});

    public getInputNode = (): Element | Text | null => {
        const node = ReactDOM.findDOMNode(this);
        return node && node instanceof Element ? node.getElementsByTagName("input")[0] : null;
    }

    private setChecked = (e: CheckboxChangeEvent) => {
        this.setState({checked: e.target.checked});
    }
}

export default CheckboxEditor;
