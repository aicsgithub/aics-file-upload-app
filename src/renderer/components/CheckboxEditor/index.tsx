import { Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { editors } from "react-data-grid";
import { EditorBaseProps } from "../../state/types";
import EditorBase = editors.EditorBase;

interface Props extends EditorBaseProps {
    value: boolean;
    propName: string;
}

interface CheckboxEditorState {
    checked: boolean;
}

class CheckboxEditor extends EditorBase<Props, CheckboxEditorState> {
    public input = React.createRef<Checkbox>();

    constructor(props: Props) {
        super(props);
        this.state = {
            checked: props.value,
        };
    }

    public componentDidUpdate(prevProps: Readonly<Props & AdazzleReactDataGrid.EditorBaseProps>,
                              prevState: Readonly<CheckboxEditorState>): void {
        if (prevState.checked !== this.state.checked) {
            setTimeout(this.props.onCommit, 1000);
        }
    }

    public render() {
        const { checked } = this.state;

        return <Checkbox checked={checked} onChange={this.setChecked} ref={this.input}/>;
    }

    public getValue() {
        return {
            [this.props.propName]: this.state.checked,
        };
    }

    public getInputNode(): Element | Text | null {
        const node = ReactDOM.findDOMNode(this);
        if (node && node instanceof Element) {
            return node.getElementsByTagName("input")[0];
        }

        return null;
    }

    private setChecked = (e: CheckboxChangeEvent) => {
        this.setState({checked: e.target.checked});
    }
}

export default CheckboxEditor;
