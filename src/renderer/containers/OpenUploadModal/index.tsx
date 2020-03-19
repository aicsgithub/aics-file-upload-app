import { Empty, Modal } from "antd";
import * as classNames from "classnames";
import { ipcRenderer } from "electron";
import { isEmpty } from "lodash";
import { ReactNode } from "react";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import { OPEN_OPEN_UPLOAD_MODAL } from "../../../shared/constants";
import { gatherUploadDraftNames } from "../../state/metadata/actions";
import { getUploadDraftNames } from "../../state/metadata/selectors";
import { GatherUploadDraftNamesAction } from "../../state/metadata/types";
import { closeModal, openModal } from "../../state/selection/actions";
import { getOpenUploadModalVisible } from "../../state/selection/selectors";
import { CloseModalAction, OpenModalAction } from "../../state/selection/types";

import {
    State,
} from "../../state/types";
import { openUploadDraft } from "../../state/upload/actions";
import { OpenUploadDraftAction } from "../../state/upload/types";

const styles = require("./style.pcss");

interface Props {
    className?: string;
    closeModal: ActionCreator<CloseModalAction>;
    draftNames: string[];
    gatherUploadDraftNames: ActionCreator<GatherUploadDraftNamesAction>;
    openModal: ActionCreator<OpenModalAction>;
    openUploadDraft: ActionCreator<OpenUploadDraftAction>;
    visible: boolean;
}

interface OpenUploadState {
    selectedDraft?: string;
}

class OpenUploadModal extends React.Component<Props, OpenUploadState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedDraft: undefined,
        };
    }

    public componentDidMount(): void {
        this.props.gatherUploadDraftNames();
        ipcRenderer.on(OPEN_OPEN_UPLOAD_MODAL, this.openModal);
    }

    public componentWillUpdate(prevProps: Props): void {
        if (prevProps.visible !== this.props.visible) {
            this.props.gatherUploadDraftNames();
            this.setState({
                selectedDraft: undefined,
            });
        }
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener(OPEN_OPEN_UPLOAD_MODAL, this.openModal);
    }

    public render() {
        const { className, draftNames, visible } = this.props;
        return (
            <Modal
                className={classNames(styles.container, className)}
                okButtonProps={{
                    disabled: !this.state.selectedDraft,
                }}
                onCancel={this.closeModal}
                onOk={this.openDraft}
                title="Open Upload Draft"
                visible={visible}
            >
                {isEmpty(draftNames) && <Empty description="No Drafts"/>}
                {draftNames.map(this.renderDraftNameRow)}
            </Modal>
        );
    }

    private renderDraftNameRow = (name: string): ReactNode => (
        <div
            className={classNames(styles.row, {[styles.selected]: this.state.selectedDraft === name})}
            key={name}
            onClick={this.selectDraftName(name)}
        >
            {name}
        </div>
    )

    private selectDraftName = (selectedDraft: string) => () => this.setState({selectedDraft});

    private openDraft = () => {
        this.props.openUploadDraft(this.state.selectedDraft);
        this.closeModal();
    }

    private openModal = () => this.props.openModal("openUpload");
    private closeModal = () => this.props.closeModal("openUpload");
}

function mapStateToProps(state: State) {
    return {
        draftNames: getUploadDraftNames(state),
        visible: getOpenUploadModalVisible(state),
    };
}

const dispatchToPropsMap = {
    closeModal,
    gatherUploadDraftNames,
    openModal,
    openUploadDraft,
};

export default connect(mapStateToProps, dispatchToPropsMap)(OpenUploadModal);
