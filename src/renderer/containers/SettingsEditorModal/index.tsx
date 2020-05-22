import { Alert, Button, Checkbox, Input, Modal, Radio } from "antd";
import { RadioChangeEvent } from "antd/lib/radio";
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
import {
  setMountPoint,
  switchEnvironment,
  updateSettings,
} from "../../state/setting/actions";
import {
  getLimsHost,
  getLimsUrl,
  getLoggedInUser,
  getMountPoint,
  getShowUploadHint,
} from "../../state/setting/selectors";
import { UpdateSettingsAction } from "../../state/setting/types";
import { State } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
  className?: string;
  closeModal: ActionCreator<CloseModalAction>;
  limsUrl: string;
  limsHost: string;
  mountPoint?: string;
  openModal: ActionCreator<OpenModalAction>;
  setMountPoint: () => void;
  showUploadHint: boolean;
  updateSettings: ActionCreator<UpdateSettingsAction>;
  username: string;
  visible: boolean;
}

interface SettingsEditorState {
  environment: Environment;
  limsUrl: string;
  showUploadHint: boolean;
  username: string;
}

enum Environment {
  Custom = "Custom",
  Staging = "Staging",
  Production = "Production",
}

const stagingUrl = "http://stg-aics.corp.alleninstitute.org:80";
const productionUrl = "http://aics.corp.alleninstitute.org:80";

class SettingsEditorModal extends React.Component<Props, SettingsEditorState> {
  constructor(props: Props) {
    super(props);
    let environment = Environment.Custom;
    if (props.limsUrl === stagingUrl) {
      environment = Environment.Staging;
    } else if (props.limsUrl === productionUrl) {
      environment = Environment.Production;
    }

    this.state = {
      environment,
      limsUrl: props.limsUrl,
      showUploadHint: props.showUploadHint,
      username: props.username,
    };
  }

  public componentDidMount(): void {
    ipcRenderer.on(OPEN_SETTINGS_EDITOR, this.openModal);
  }

  public componentWillUnmount(): void {
    ipcRenderer.removeListener(OPEN_SETTINGS_EDITOR, this.openModal);
  }

  public openModal = () => this.props.openModal("settings");

  public render() {
    const { className, visible } = this.props;

    return (
      <Modal
        width="90%"
        className={className}
        title="Settings"
        visible={visible}
        okButtonProps={{
          disabled: this.getErrors().length > 0,
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
    const { mountPoint } = this.props;

    const { environment, limsUrl, showUploadHint, username } = this.state;
    const errors = this.getErrors();

    return (
      <>
        {errors.length > 0 && (
          <Alert
            type="error"
            message={errors.map((e: string) => (
              <div key={e}>{e}</div>
            ))}
            showIcon={true}
          />
        )}
        <div className={styles.row}>
          <div className={styles.key}>Mount Point</div>
          <div className={styles.value}>{mountPoint || "Not Set"}</div>
          <Button
            className={styles.action}
            type="link"
            onClick={this.props.setMountPoint}
          >
            {mountPoint ? "Update" : "Set"}
          </Button>
        </div>
        <div className={styles.row}>
          <div className={styles.key}>LIMS URL</div>
          {environment === Environment.Custom ? (
            <Input
              className={styles.value}
              value={limsUrl}
              onChange={this.setLimsUrl}
            />
          ) : (
            <div className={styles.value}>{limsUrl}</div>
          )}
          <Radio.Group onChange={this.switchEnvironment} value={environment}>
            <Radio.Button value={Environment.Custom}>Custom</Radio.Button>
            <Radio.Button value={Environment.Staging}>Staging</Radio.Button>
            <Radio.Button value={Environment.Production}>
              Production
            </Radio.Button>
          </Radio.Group>
        </div>
        <div className={styles.row}>
          <div className={styles.key}>Username</div>
          <Input
            className={styles.value}
            value={username}
            onChange={this.setUsername}
          />
        </div>
        <div className={styles.row}>
          <div className={styles.key}>Show Upload Hints</div>
          <Checkbox
            className={styles.value}
            checked={showUploadHint}
            onChange={this.toggleShowHints}
          />
        </div>
      </>
    );
  };

  private closeModal = () => this.props.closeModal("settings");
  private switchEnvironment = (e: RadioChangeEvent) => {
    let limsUrl = "";
    if (e.target.value === Environment.Staging) {
      limsUrl = stagingUrl;
      this.setState({ environment: e.target.value, limsUrl });
    } else if (e.target.value === Environment.Production) {
      limsUrl = productionUrl;
      this.setState({ environment: e.target.value, limsUrl });
    } else {
      this.setState({ environment: e.target.value, limsUrl });
    }
  };
  private setLimsUrl = (e: ChangeEvent<HTMLInputElement>) =>
    this.setState({ limsUrl: e.target.value });

  private setUsername = (e: ChangeEvent<HTMLInputElement>) =>
    this.setState({ username: e.target.value });

  private getErrors = () => {
    const errors = [];
    const { limsUrl, username } = this.state;

    if (!trim(username)) {
      errors.push("Username cannot be blank");
    }

    const completeLimsUrl = limsUrl.startsWith("http")
      ? limsUrl
      : `http://${limsUrl}`;
    try {
      // using URL constructor to validate user input
      // tslint:disable-next-line
      new URL(completeLimsUrl);
    } catch {
      errors.push("Invalid LIMS URL format");
    }
    return errors;
  };
  private save = () => {
    const { showUploadHint, username } = this.state;
    const trimmedUsername = trim(username);
    const url = this.getURL();
    this.props.updateSettings({
      limsHost: url.hostname,
      limsPort: url.port || "80",
      showUploadHint,
      username: trimmedUsername,
    });
    this.closeModal();
  };
  private getURL = () => {
    const { environment, limsUrl } = this.state;
    let url: string = limsUrl;
    if (environment === Environment.Production) {
      url = productionUrl;
    } else if (environment === Environment.Staging) {
      url = stagingUrl;
    }

    // protocol is required for creating a URL object
    const completeLimsUrl = url.startsWith("http") ? url : `http://${url}`;
    return new URL(completeLimsUrl);
  };

  private toggleShowHints = () =>
    this.setState({ showUploadHint: !this.state.showUploadHint });
}

function mapStateToProps(state: State) {
  const visible = getSettingsEditorVisible(state);
  return {
    key: visible,
    limsHost: getLimsHost(state),
    limsUrl: getLimsUrl(state),
    mountPoint: getMountPoint(state),
    showUploadHint: getShowUploadHint(state),
    username: getLoggedInUser(state),
    visible,
  };
}

const dispatchToPropsMap = {
  closeModal,
  openModal,
  setMountPoint,
  switchEnvironment,
  updateSettings,
};
export default connect(
  mapStateToProps,
  dispatchToPropsMap
)(SettingsEditorModal);
