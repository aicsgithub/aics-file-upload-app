import { Modal } from "antd";
import * as React from "react";
import { ActionCreator } from "redux";
import { CreateSchemaAction, SchemaDefinition } from "../../state/setting/types";

// const styles = require("./styles.pcss");

interface Props {
    className?: string;
    createSchema: ActionCreator<CreateSchemaAction>;
    close: () => void;
    visible: boolean;
}

interface CreateSchemaModalState {
    draft?: SchemaDefinition;
}

class CreateSchemaModal extends React.Component<Props, CreateSchemaModalState> {
    public state: CreateSchemaModalState = {};
    public render() {
        const {
            className,
            close,
            visible,
        } = this.props;
        return (
            <Modal
                className={className}
                title="Create Schema"
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={close}
            >
                Some content
            </Modal>
        );
    }

    private saveAndClose = () => {
        this.props.createSchema(this.state.draft);
        this.props.close();
    }
}

export default CreateSchemaModal;
