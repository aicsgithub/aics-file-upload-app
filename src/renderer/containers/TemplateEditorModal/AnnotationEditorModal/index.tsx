import { Modal } from "antd";
import React from "react";

interface Props {
    visible: boolean;
    onSave: () => void;
    onCancel: () => void;
}

export default function AnnotationEditorModal(props: Props) {
    return (
        <Modal
          width="90%"
          title="Annotation Editor"
          visible={props.visible}
          onOk={props.onSave}
          onCancel={props.onCancel}
          okText="Save"
          maskClosable={false}
          destroyOnClose={true} // Unmount child components
        >
            Hello
        </Modal>
    )
}
