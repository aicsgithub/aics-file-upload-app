import { Button, Icon, Modal, Switch } from "antd";
import classNames from "classnames";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { closeSettings } from "../../state/feedback/actions";
import { setMountPoint, updateSettings } from "../../state/setting/actions";
import { getSettings } from "../../state/setting/selectors";
import { AlertType, SettingStateBranch } from "../../state/types";

const styles = require("./styles.pcss");

const iconPropsLookup = {
  [AlertType.WARN]: {
    type: "warning",
    className: classNames(styles.icon, styles.warn),
  },
  [AlertType.SUCCESS]: {
    type: "check-circle",
    className: classNames(styles.icon, styles.success),
  },
  [AlertType.ERROR]: {
    type: "exclamation-circle",
    className: classNames(styles.icon, styles.error),
  },
  [AlertType.INFO]: {
    type: "info-circle",
    className: classNames(styles.icon, styles.info),
  },
  [AlertType.DRAFT_SAVED]: {
    type: "save",
    className: classNames(styles.icon, styles.save),
  },
};

const genericSettingsItems = [
  {
    type: AlertType.INFO,
    label: "Upload Hints",
    dataField: "showUploadHint",
  },
  {
    type: AlertType.INFO,
    label: "Template Hints",
    dataField: "showTemplateHint",
  },
];

const notificationSettingsItems = [
  {
    type: AlertType.SUCCESS,
    label: "Success",
  },
  {
    type: AlertType.ERROR,
    label: "Error",
  },
  {
    type: AlertType.WARN,
    label: "Warning",
  },
  {
    type: AlertType.INFO,
    label: "Info",
  },
  {
    type: AlertType.DRAFT_SAVED,
    label: "Draft Saved",
  },
];

function getIcon(type: AlertType) {
  return <Icon theme="filled" {...iconPropsLookup[type]} />;
}

export default function SettingsModal({ visible }: { visible: boolean }) {
  const dispatch = useDispatch();
  const settings = useSelector(getSettings);

  const [settingsDraft, setSettingsDraft] = React.useState<SettingStateBranch>(
    settings
  );

  function changeEnabledNotification(checked: boolean, type: AlertType) {
    setSettingsDraft({
      ...settingsDraft,
      enabledNotifications: {
        ...settingsDraft.enabledNotifications,
        [type]: checked,
      },
    });
  }

  const genericSettings = (
    <>
      <h3>Hint Settings</h3>
      <div className={styles.toggleLabel}>Show Hints</div>
      {genericSettingsItems.map(({ dataField, type, label }) => (
        <div key={label} className={styles.settingsContainer}>
          <div className={styles.settingLabel}>
            {getIcon(type)} {label}
          </div>
          <div className={styles.toggle}>
            <Switch
              checked={settingsDraft[dataField as "showUploadHint"]}
              onChange={(checked) =>
                setSettingsDraft({ ...settingsDraft, [dataField]: checked })
              }
            />
          </div>
        </div>
      ))}
    </>
  );

  const notificationSettings = (
    <>
      <h3 className={styles.settingsTitle}>Notification Settings</h3>
      <div className={styles.toggleLabel}>Show in Notification Center</div>
      {notificationSettingsItems.map(({ type, label }) => (
        <div key={label} className={styles.settingsContainer}>
          <div className={styles.settingLabel}>
            {getIcon(type)} {label}
          </div>
          <div className={styles.toggle}>
            <Switch
              checked={settingsDraft.enabledNotifications[type]}
              onChange={(checked) => changeEnabledNotification(checked, type)}
            />
          </div>
        </div>
      ))}
    </>
  );

  const footer = (
    <div className={styles.settingsButtons}>
      <Button type="danger" onClick={() => dispatch(closeSettings())}>
        Cancel
      </Button>
      <Button
        type="primary"
        onClick={() =>
          dispatch(
            updateSettings({
              ...settingsDraft,
              mountPoint: settings.mountPoint,
            })
          )
        }
      >
        Apply
      </Button>
    </div>
  );

  return (
    <Modal
      closable={false}
      footer={footer}
      mask={false}
      onCancel={() => dispatch(closeSettings())}
      title={<div className={styles.modalHeader}>Settings</div>}
      wrapClassName="notification-modal"
      visible={visible}
    >
      {genericSettings}
      <hr />
      {notificationSettings}
      <hr />
      <h3>Advanced Settings</h3>
      <div className={styles.toggleLabel}>Update</div>
      <div className={styles.settingsContainer}>
        <div className={styles.settingLabel}>Allen Drive Mount Point</div>
        <div className={styles.toggle}>
          {settings.mountPoint}{" "}
          <Button
            className={styles.mountPointButton}
            icon="edit"
            onClick={() => dispatch(setMountPoint())}
          />
        </div>
      </div>
    </Modal>
  );
}
