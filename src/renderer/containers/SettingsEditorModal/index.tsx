import { Alert, Button, Input, Modal } from "antd";
import { ipcRenderer } from "electron";
import { trim } from "lodash";
import * as React from "react";
import { ChangeEvent, ReactNode, ReactNodeArray } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_SETTINGS_EDITOR } from "../../../shared/constants";
import { closeModal, openModal } from "../../state/feedback/actions";

import { getSettingsEditorVisible } from "../../state/feedback/selectors";
import { CloseModalAction, OpenModalAction } from "../../state/feedback/types";
import { setMountPoint, switchEnvironment, updateSettings } from "../../state/setting/actions";
import { getLimsUrl, getLoggedInUser, getMountPoint } from "../../state/setting/selectors";
import { UpdateSettingsAction } from "../../state/setting/types";
import { State } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
    className?: string;
    closeModal: ActionCreator<CloseModalAction>;
    limsUrl: string;
    mountPoint?: string;
    openModal: ActionCreator<OpenModalAction>;
    setMountPoint: () => void;
    switchEnvironment: () => void;
    updateSettings: ActionCreator<UpdateSettingsAction>;
    username: string;
    visible: boolean;
}

interface SettingsEditorState {
    username: string;
}

class SettingsEditorModal extends React.Component<Props, SettingsEditorState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            username: props.username,
        };
    }

    public componentDidMount(): void {
        ipcRenderer.on(OPEN_SETTINGS_EDITOR, this.openModal);
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.username !== this.props.username) {
            this.setState({username: this.props.username});
        }
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener(OPEN_SETTINGS_EDITOR, this.openModal);
    }

    public openModal = () => this.props.openModal("settings");

    public render() {
        const {
            className,
            visible,
        } = this.props;

        return (
            <Modal
                width="90%"
                className={className}
                title="Settings"
                visible={visible}
                okButtonProps={{
                    disabled: !this.canSave(),
                }}
                okText="Save"
                onCancel={this.closeModal}
                onOk={this.save}
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

        const { username } = this.state;

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
                {!this.canSave() && <Alert message="Username must be defined" type="error" showIcon={true}/>}
                <div className={styles.row}>
                    <div className={styles.key}>Username</div>
                    <Input className={styles.value} value={username} onChange={this.setUsername}/>
                </div>
            </>);
    }

    private closeModal = () => this.props.closeModal("settings");
    private setUsername = (e: ChangeEvent<HTMLInputElement>) => this.setState({username: e.target.value});
    private canSave = () => !!trim(this.state.username);
    private save = () => {
        if (this.state.username !== this.props.username && this.canSave()) {
            this.props.updateSettings({username: this.state.username});
        }

        this.closeModal();
    }
}

function mapStateToProps(state: State) {
    return {
        limsUrl: getLimsUrl(state),
        mountPoint: getMountPoint(state),
        username: getLoggedInUser(state),
        visible: getSettingsEditorVisible(state),
    };
}

const dispatchToPropsMap = {
    closeModal,
    openModal,
    setMountPoint,
    switchEnvironment,
    updateSettings,
};
export default connect(mapStateToProps, dispatchToPropsMap)(SettingsEditorModal);
