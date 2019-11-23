import { Button, Modal } from "antd";
import { ipcRenderer } from "electron";
import * as React from "react";
import { ReactNode, ReactNodeArray } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_SETTINGS_EDITOR } from "../../../shared/constants";
import { closeSettingsEditor, openSettingsEditor } from "../../state/selection/actions";
import { getSettingsEditorVisible } from "../../state/selection/selectors";
import { CloseSettingsEditorAction, OpenSettingsEditorAction } from "../../state/selection/types";
import { setMountPoint, switchEnvironment } from "../../state/setting/actions";
import { getLimsUrl, getMountPoint } from "../../state/setting/selectors";
import { State } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
    className?: string;
    closeModal: ActionCreator<CloseSettingsEditorAction>;
    limsUrl: string;
    mountPoint?: string;
    openModal: ActionCreator<OpenSettingsEditorAction>;
    setMountPoint: () => void;
    switchEnvironment: () => void;
    visible: boolean;
}

class SettingsEditorModal extends React.Component<Props, {}> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showInfoAlert: true,
        };
    }

    public componentDidMount(): void {
        ipcRenderer.on(OPEN_SETTINGS_EDITOR, this.openModal);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener(OPEN_SETTINGS_EDITOR, this.openModal);
    }

    public openModal = () => this.props.openModal();

    public render() {
        const {
            className,
            closeModal,
            visible,
        } = this.props;

        return (
            <Modal
                width="90%"
                className={className}
                title="Settings"
                visible={visible}
                onCancel={closeModal}
                onOk={closeModal}
                maskClosable={false}
            >
                {this.renderBody()}
            </Modal>
        );
    }

    private renderBody = (): ReactNode | ReactNodeArray => {
        const {
            mountPoint,
            limsUrl,
        } = this.props;

        return (
            <>
                <div className={styles.row}>
                    <div className={styles.key}>Mount Point</div>
                    <div className={styles.value}>{mountPoint || "Not Set"}</div>
                    <Button className={styles.action} type="link" onClick={this.props.setMountPoint}>
                        {mountPoint ? "Update" : "Set"}
                    </Button>
                </div>
                <div className={styles.row}>
                    <div className={styles.key}>LIMS Host</div>
                    <div className={styles.value}>{limsUrl}</div>
                    <Button className={styles.action} type="link" onClick={this.props.switchEnvironment}>
                        Update
                    </Button>
                </div>
            </>);
    }
}

function mapStateToProps(state: State) {
    return {
        limsUrl: getLimsUrl(state),
        mountPoint: getMountPoint(state),
        visible: getSettingsEditorVisible(state),
    };
}

const dispatchToPropsMap = {
    closeModal: closeSettingsEditor,
    openModal: openSettingsEditor,
    setMountPoint,
    switchEnvironment,
};
export default connect(mapStateToProps, dispatchToPropsMap)(SettingsEditorModal);
