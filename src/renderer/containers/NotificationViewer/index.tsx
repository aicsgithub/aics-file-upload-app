import { Button, Icon, Modal, Switch } from "antd";
import * as classNames from "classnames";
import * as moment from "moment";
import * as React from "react";
import { useState } from "react";
import { useSelector } from "react-redux";

import { getEventsByNewest } from "../../state/feedback/selectors";
import { AlertType } from "../../state/types";

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

function getIcon(type: AlertType) {
  return <Icon theme="filled" {...iconPropsLookup[type]} />;
}

function formatDate(date: Date): string {
  return moment(date).format("MM/DD/YYYY [at] HH:mm A");
}

export default function NotificationViewer() {
  const events = useSelector(getEventsByNewest);
  const [showEvents, setShowEvents] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSuccess, setShowSuccess] = useState(true);
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showDraftSaved, setShowDraftSaved] = useState(false);

  const modalHeader = (
    <div className={styles.modalHeader}>
      Notifications
      <Icon
        type="setting"
        theme="filled"
        className={styles.settingsIcon}
        onClick={() => setShowSettings(true)}
      />
    </div>
  );

  const eventList = events.map((event) => (
    <div
      key={event.date.toISOString()}
      className={styles.notificationContainer}
    >
      <div className={styles.iconContainer}>{getIcon(event.type)}</div>
      <div className={styles.message}>{event.message}</div>
      <div className={styles.timestamp}>{formatDate(event.date)}</div>
    </div>
  ));

  const settingsItems = [
    {
      type: AlertType.SUCCESS,
      label: "Success",
      checked: showSuccess,
      setter: setShowSuccess,
    },
    {
      type: AlertType.ERROR,
      label: "Error",
      checked: showErrors,
      setter: setShowErrors,
    },
    {
      type: AlertType.WARN,
      label: "Warning",
      checked: showWarnings,
      setter: setShowWarnings,
    },
    {
      type: AlertType.INFO,
      label: "Info",
      checked: showInfo,
      setter: setShowInfo,
    },
    {
      type: AlertType.DRAFT_SAVED,
      label: "Draft Saved",
      checked: showDraftSaved,
      setter: setShowDraftSaved,
    },
  ];

  const settingsPage = (
    <>
      <div className={styles.settingsTitle}>Notification Settings</div>
      <div className={styles.toggleLabel}>Show in Notification Center</div>
      {settingsItems.map((item) => (
        <div key={item.type} className={styles.settingsContainer}>
          <div className={styles.notificationType}>
            {getIcon(item.type)} {item.label}
          </div>
          <div className={styles.toggle}>
            <Switch
              checked={item.checked}
              onChange={(checked) => item.setter(checked)}
            />
          </div>
        </div>
      ))}
      <div className={styles.settingsButtons}>
        <Button type="danger" onClick={() => setShowSettings(false)}>
          Cancel
        </Button>
        <Button type="primary">Apply</Button>
      </div>
    </>
  );

  return (
    <>
      <Icon
        type="bell"
        theme="filled"
        className={classNames(styles.icon, styles.notificationBell)}
        onClick={() => setShowEvents(true)}
      />
      <Modal
        title={modalHeader}
        visible={showEvents}
        mask={false}
        footer={null}
        onCancel={() => setShowEvents(false)}
        closable={false}
        wrapClassName="notification-modal"
      >
        {showSettings ? settingsPage : eventList}
      </Modal>
    </>
  );
}
