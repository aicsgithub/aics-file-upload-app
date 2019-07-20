import { Input } from "antd";
import * as classNames from "classnames";
import { ChangeEvent } from "react";
import * as React from "react";

const styles = require("./styles.pcss");

interface EditableTextProps {
    className?: string;
    isEditing?: boolean;
    value?: string;
    onBlur: (value?: string) => void;
    placeholder?: string;
    onIsValidChange?: (isValid: boolean) => void;
}

interface EditableTextState {
    isEditing: boolean;
    newValue?: string;
}

class EditableText extends React.Component<EditableTextProps, EditableTextState> {
    public input?: HTMLInputElement;

    constructor(props: EditableTextProps) {
        super(props);
        this.state = {
            isEditing: props.isEditing || false,
            newValue: props.value,
        };
    }

    public componentDidMount() {
        if (this.input && this.props.isEditing) {
            this.input.focus();
        }
    }

    public componentDidUpdate(newProps: EditableTextProps) {
        if (this.input && newProps.isEditing) {
            this.input.focus();
        }
    }

    public render() {
        const {
            className,
            placeholder,
        } = this.props;
        const { isEditing, newValue } = this.state;
        if (!isEditing) {
            return (
                <div className={classNames(styles.readOnly, className)} onClick={this.setIsEditing(true)}>
                    <span>{newValue}</span>
                </div>
        );
        }

        return (
            <Input
                className={className}
                placeholder={placeholder}
                onChange={this.updateValue}
                value={newValue}
                ref={(i: Input) => { this.input = i ? i.input : undefined; }}
                onBlur={this.setIsEditing(false)}
            />
        );
    }

    private updateValue = (event: ChangeEvent<HTMLInputElement>) => {
        this.setState({ newValue: event.target.value });
    }

    private setIsEditing = (isEditing: boolean): () => void  => {
        return () => {
            this.setState({isEditing});

            if (!isEditing) {
                this.props.onBlur(this.state.newValue);
            }
        };
    }
}

export default EditableText;
