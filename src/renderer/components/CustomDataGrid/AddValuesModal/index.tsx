import { Alert, Modal, Select } from "antd";
import { castArray } from "lodash";
import * as React from "react";
import { ColumnType } from "../../../state/template/types";
import { UploadJobTableRow, UploadMetadata } from "../../../state/upload/types";

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
        const {error} = this.state;

        let input;
        if (!!annotationOptions) {
            input = (
                <Select
                    className={styles.input}
                    allowClear={true}
                    onChange={this.selectValues}
                    mode="multiple"
                    value={this.state.values}
                >
                    {annotationOptions.map((o) => <Select.Option value={o} key={o}>{o}</Select.Option>)}
                </Select>
            );
        } else if (annotationType === ColumnType.TEXT || annotationType === ColumnType.NUMBER) {
            input = (
                <Select
                    className={styles.input}
                    allowClear={true}
                    onSelect={this.selectValues}
                    mode="multiple"
                />
            );
        }

        return (
            <Modal
                width="50%"
                title="Add Values"
                visible={visible}
                onOk={this.submit}
                onCancel={onCancel}
                okText="Save"
            >
                {input}
                {error && <Alert type="error" message="Could not save values" description={error}/>}
            </Modal>
        );
    }

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
