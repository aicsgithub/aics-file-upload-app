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
    setIsEditing: (isEditing: boolean) => void;
    onIsValidChange?: (isValid: boolean) => void;
}

interface EditableTextState {
    newValue?: string;
}

class EditableText extends React.Component<EditableTextProps, EditableTextState> {
    public input?: HTMLInputElement;

    constructor(props: EditableTextProps) {
        super(props);
        this.state = {
            newValue: props.value,
        };
    }

    public componentDidMount() {
        if (this.input && this.props.isEditing) {
            this.input.focus();
        }
    }

    public componentDidUpdate(newProps: EditableTextProps) {
        if (this.input && this.props.isEditing) {
            this.input.focus();
        }
    }

    public render() {
        const {
            className,
            isEditing,
            placeholder,
        } = this.props;
        const { newValue } = this.state;

        return (
            <div
                className={classNames({[styles.readOnly]: !isEditing}, className)}
                onClick={this.setIsEditing(true)}
            >
                {!isEditing && <span>{newValue}</span>}
                <Input
                    className={styles.input}
                    placeholder={placeholder}
                    onChange={this.updateValue}
                    value={newValue}
                    ref={(i: Input) => {
                        this.input = i ? i.input : undefined;
                    }}
                    onBlur={this.setIsEditing(false)}
                    type={isEditing ? "text" : "hidden"}
                />
            </div>
        );
    }

    private updateValue = (event: ChangeEvent<HTMLInputElement>) => {
        this.setState({ newValue: event.target.value });
    }

    private setIsEditing = (isEditing: boolean) => {
        return () => {
            this.props.setIsEditing(isEditing);

            if (!isEditing) {
                this.props.onBlur(this.state.newValue);
            }
        };
    }
}

export default EditableText;
