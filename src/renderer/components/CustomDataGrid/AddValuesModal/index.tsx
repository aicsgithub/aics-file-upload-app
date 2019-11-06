import { Alert, Button, Modal } from "antd";
import { castArray, includes, isNil } from "lodash";
import * as React from "react";
import { ColumnType } from "../../../state/template/types";
import { UploadJobTableRow, UploadMetadata } from "../../../state/upload/types";
import Editor from "../Editor";

const styles = require("./styles.pcss");

interface Props {
    annotationName?: string;
    annotationOptions?: string[];
    annotationType?: ColumnType;
    onOk: (value: any, key: keyof UploadMetadata, row: UploadJobTableRow) => void;
    onCancel: () => void;
    row?: UploadJobTableRow;
    values?: any[];
    visible: boolean;
}

interface AddValuesModalState {
    draft?: any;
    error?: string;
    values: any[];
}

class AddValuesModal extends React.Component<Props, AddValuesModalState> {

    constructor(props: Props) {
        super(props);
        this.state = {
            values: props.values ? castArray(props.values) : [],
        };
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.visible !== this.props.visible && this.props.visible) {
            this.setState({
                values: this.props.values ? castArray(this.props.values) : [],
            });
        }
    }

    public render() {
        const {annotationOptions, annotationType, onCancel, visible} = this.props;
        const {error, values} = this.state;

        const isSelectorType = includes([ColumnType.DROPDOWN, ColumnType.LOOKUP], annotationType);
        const editorValue = isSelectorType ? values :
            this.state.draft;
        const allValues = !isNil(values) ? castArray(values) : [];

        return (
            <Modal
                width="50%"
                title="Add Values"
                visible={visible}
                onOk={this.submit}
                onCancel={onCancel}
                okText="Save"
            >
                <div className={styles.formContainer}>
                    <Editor
                        allowMultipleValues={isSelectorType}
                        className={styles.editor}
                        dropdownValues={annotationOptions}
                        onChange={isSelectorType ? this.selectValues : this.updateDraft}
                        onPressEnter={this.addValue}
                        type={annotationType}
                        value={editorValue}
                    />
                    {!isSelectorType && <Button onClick={this.addValue} type="primary">Add</Button>}
                </div>
                {!isSelectorType && allValues.map((v, i) => (
                    <div key={v + i}>{v}</div>
                ))}
                {error && <Alert type="error" message="Could not save values" description={error}/>}
            </Modal>
        );
    }

    private updateDraft = (draft: any) => this.setState({draft});
    private addValue = () => this.setState({draft: undefined, values: [...this.state.values, this.state.draft]});

    private selectValues = (values: any[]) => {
        this.setState({values});
    }

    private submit = () => {
        const {values} = this.state;
        const {annotationName, row} = this.props;
        if (annotationName && row) {
            this.props.onOk(values, annotationName, row);
        } else {
            this.setState({error: "AnnotationName or Row info not provided. Contact Software."});
        }
    }
}

export default AddValuesModal;
