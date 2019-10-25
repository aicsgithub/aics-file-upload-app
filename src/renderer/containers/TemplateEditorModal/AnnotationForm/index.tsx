import { Button, Checkbox, Input } from "antd";
import TextArea from "antd/lib/input/TextArea";
import * as classNames from "classnames";
import * as React from "react";
import LabeledInput from "../../../components/LabeledInput";
import { AnnotationDraft } from "../../../state/template/types";

const styles = require("./styles.pcss");

interface Props {
    className?: string;
    annotation?: AnnotationDraft;
}

interface AnnotationFormState {
    isEditing: boolean;
}

class AnnotationForm extends React.Component<Props, AnnotationFormState> {

    constructor(props: Props) {
        super(props);
        this.state = {
            isEditing: !!props.annotation,
        };
    }

    public render() {
        const {
            annotation,
            className,
        } = this.props;
        const { isEditing } = this.state;
        const isReadOnly = Boolean(annotation && annotation.annotationId);

        return (
            <form
                className={classNames(styles.container, className)}
            >
                <h4>{isEditing ? "Edit Annotation" : "Create New Annotation"}</h4>
                <LabeledInput label="Annotation Name">
                    <Input value={annotation ? annotation.name : undefined} disabled={isReadOnly}/>
                </LabeledInput>
                <LabeledInput label="Data Type">
                    <Input value={annotation ? annotation.type.name : undefined} disabled={isReadOnly}/>
                </LabeledInput>
                <LabeledInput label="Description">
                    <TextArea value={annotation ? annotation.description : undefined} disabled={isReadOnly}/>
                </LabeledInput>
                <Checkbox value={annotation ? annotation.required : undefined}>Required</Checkbox>
                <Checkbox value={annotation ? annotation.canHaveMany : undefined}>Allow Multiple Values</Checkbox>
                <div className={styles.buttonContainer}>
                    <Button className={styles.button} type="primary">{isEditing ? "Update" : "Add"}</Button>
                </div>
            </form>
        );
    }
}

export default AnnotationForm;
