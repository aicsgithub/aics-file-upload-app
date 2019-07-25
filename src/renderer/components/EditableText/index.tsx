import { Input } from "antd";
import * as classNames from "classnames";
import { ChangeEvent } from "react";
import * as React from "react";
import FormControl from "../FormControl";

const styles = require("./styles.pcss");

interface EditableTextProps {
    className?: string;
    error?: string;
    isEditing: boolean;
    onBlur: (value?: string) => void;
    setIsEditing: (isEditing: boolean) => void;
    value?: string;
}

interface EditableTextState {
    newValue?: string;
}

// An input that reverts to plain text when not focused
// Additionally, it displays errors if errors present
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
            error,
            isEditing,
        } = this.props;
        const { newValue } = this.state;

        return (
            <FormControl
                className={classNames(
                    styles.container,
                    {[styles.readOnly]: !isEditing},
                    className
                )}
                error={error}
                onClick={this.setIsEditing(true)}
            >
                {!isEditing && <div>{newValue}</div>}
                <Input
                    className={styles.input}
                    onChange={this.updateValue}
                    value={newValue}
                    ref={(i: Input) => {
                        this.input = i ? i.input : undefined;
                    }}
                    onBlur={this.setIsEditing(false)}
                    type={isEditing ? "text" : "hidden"}
                />
            </FormControl>
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
