import { Modal } from "antd";
import * as classNames from "classnames";
import { ipcRenderer } from "electron";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_OPEN_TEMPLATE_MODAL } from "../../../shared/constants";
import TemplateSearch from "../../components/TemplateSearch";
import { closeOpenTemplateModal, openOpenTemplateModal, openTemplateEditor } from "../../state/selection/actions";
import { getOpenTemplateModalVisible } from "../../state/selection/selectors";
import {
    CloseOpenTemplateModalAction,
    OpenOpenTemplateModalAction,
    OpenTemplateEditorAction,
} from "../../state/selection/types";

import {
    State,
} from "../../state/types";

const styles = require("./styles.pcss");

interface OpenTemplateModalProps {
    className?: string;
    close: ActionCreator<CloseOpenTemplateModalAction>;
    openOpenTemplateModal: ActionCreator<OpenOpenTemplateModalAction>;
    openTemplateEditor: (templateId?: number) => OpenTemplateEditorAction;
    visible: boolean;
}

class OpenTemplateModal extends React.Component<OpenTemplateModalProps, {}> {
    public componentDidMount(): void {
        ipcRenderer.on(OPEN_OPEN_TEMPLATE_MODAL, this.props.openOpenTemplateModal);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener(OPEN_OPEN_TEMPLATE_MODAL, this.props.openOpenTemplateModal);
    }

    public render() {
        const { className, close, visible } = this.props;
        return (
            <Modal
                className={classNames(styles.container, className)}
                onCancel={close}
                title="Open Template"
                visible={visible}
            >
                <TemplateSearch className={styles.search} onSelect={this.openTemplateEditor}/>
            </Modal>
        );
    }

    private openTemplateEditor = (templateId: number): void => {
        this.props.openTemplateEditor(templateId);
        this.props.close();
    }
}

function mapStateToProps(state: State) {
    return {
        visible: getOpenTemplateModalVisible(state),
    };
}

const dispatchToPropsMap = {
    close: closeOpenTemplateModal,
    openOpenTemplateModal,
    openTemplateEditor,
};

export default connect(mapStateToProps, dispatchToPropsMap)(OpenTemplateModal);
