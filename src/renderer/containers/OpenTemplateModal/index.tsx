import { Modal } from "antd";
import * as classNames from "classnames";
import { ipcRenderer } from "electron";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_OPEN_TEMPLATE_MODAL } from "../../../shared/constants";
import TemplateSearch from "../../components/TemplateSearch";
import { requestTemplates } from "../../state/metadata/actions";
import { getTemplates } from "../../state/metadata/selectors";
import { GetTemplatesAction } from "../../state/metadata/types";
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
import { LabkeyTemplate } from "../../util/labkey-client/types";

const styles = require("./styles.pcss");

interface OpenTemplateModalProps {
    className?: string;
    close: ActionCreator<CloseOpenTemplateModalAction>;
    openOpenTemplateModal: ActionCreator<OpenOpenTemplateModalAction>;
    openTemplateEditor: (templateId?: number) => OpenTemplateEditorAction;
    requestTemplates: ActionCreator<GetTemplatesAction>;
    templates: LabkeyTemplate[];
    visible: boolean;
}

class OpenTemplateModal extends React.Component<OpenTemplateModalProps, {}> {
    constructor(props: OpenTemplateModalProps) {
        super(props);
        this.state = {};
    }

    public componentDidMount(): void {
        ipcRenderer.on(OPEN_OPEN_TEMPLATE_MODAL, this.props.openOpenTemplateModal);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener(OPEN_OPEN_TEMPLATE_MODAL, this.props.openOpenTemplateModal);
    }

    public componentDidUpdate(prevProps: OpenTemplateModalProps): void {
        if (this.props.visible && this.props.visible !== prevProps.visible) {
            this.props.requestTemplates();
        }
    }

    public render() {
        const { className, close, templates, visible } = this.props;
        return (
            <Modal
                className={classNames(styles.container, className)}
                onCancel={close}
                title="Open Template"
                visible={visible}
            >
                <TemplateSearch className={styles.search} templates={templates} onSelect={this.openTemplateEditor}/>
            </Modal>
        );
    }

    private openTemplateEditor = (templateName: string): void => {
        const template = this.props.templates.find((t) => t.Name === templateName);
        if (template) {
            this.props.openTemplateEditor(template.TemplateId);
            this.props.close();
        } else {
            throw new Error("Could not find templateId");
        }
    }
}

function mapStateToProps(state: State) {
    return {
        templates: getTemplates(state),
        visible: getOpenTemplateModalVisible(state),
    };
}

const dispatchToPropsMap = {
    close: closeOpenTemplateModal,
    openOpenTemplateModal,
    openTemplateEditor,
    requestTemplates,
};

export default connect(mapStateToProps, dispatchToPropsMap)(OpenTemplateModal);
