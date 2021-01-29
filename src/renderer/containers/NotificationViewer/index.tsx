import { Badge, Button, Icon, Modal, Switch } from "antd";
import * as classNames from "classnames";
import * as moment from "moment";
import * as React from "react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { closeNotificationCenter } from "../../state/feedback/actions";
import { getEventsByNewest } from "../../state/feedback/selectors";
import { updateSettings } from "../../state/setting/actions";
import { getEnabledNotifications } from "../../state/setting/selectors";
import { AlertType } from "../../state/types";

import { getFilteredEvents, getUnreadEventsCount } from "./selectors";

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
  const dispatch = useDispatch();

  const filteredEvents = useSelector(getFilteredEvents);
  const allEvents = useSelector(getEventsByNewest);
  const unreadEventsCount = useSelector(getUnreadEventsCount);
  const [showEvents, setShowEvents] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const enabledNotifications = useSelector(getEnabledNotifications);
  // We keep a draft of the user's notification settings, because we don't want
  // to make use of them until they click "Apply".
  const [enabledNotificationsDraft, setEnabledNotificationsDraft] = useState(
    enabledNotifications
  );

  // Reset the draft enabled notifications whenever the ones in the store
  // change. This is technically derived state, which should be avoided, but
  // it was the simplest solution in this case.
  useEffect(() => setEnabledNotificationsDraft(enabledNotifications), [
    enabledNotifications,
  ]);

  function closeModal() {
    setShowEvents(false);
    dispatch(closeNotificationCenter());
  }

  function changeEnabledNotification(checked: boolean, type: AlertType) {
    setEnabledNotificationsDraft((prev) => ({
      ...prev,
      [type]: checked,
    }));
  }

  function applySettings() {
    setShowSettings(false);
    dispatch(
      updateSettings({ enabledNotifications: enabledNotificationsDraft })
    );
  }

  function cancelSettings() {
    setShowSettings(false);
    setEnabledNotificationsDraft(enabledNotifications);
  }

  function renderEventsPage() {
    if (filteredEvents.length > 0) {
      return filteredEvents.map((event) => (
        <div
          key={event.date.toISOString()}
          className={classNames(styles.notificationContainer, {
            [styles.unread]: !event.viewed,
          })}
        >
          <div className={styles.iconContainer}>{getIcon(event.type)}</div>
          <div className={styles.message}>{event.message}</div>
          <div className={styles.timestamp}>{formatDate(event.date)}</div>
        </div>
      ));
    } else if (allEvents.length > 0) {
      return "No notifications matching your settings.";
    } else {
      return "No notifications yet for the current session.";
    }
  }

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

  const settingsItems = [
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

  const settingsPage = (
    <>
      <div className={styles.settingsTitle}>Notification Settings</div>
      <div className={styles.toggleLabel}>Show in Notification Center</div>
      {settingsItems.map(({ type, label }) => (
        <div key={type} className={styles.settingsContainer}>
          <div className={styles.notificationType}>
            {getIcon(type)} {label}
          </div>
          <div className={styles.toggle}>
            <Switch
              checked={enabledNotificationsDraft[type]}
              onChange={(checked) => changeEnabledNotification(checked, type)}
            />
          </div>
        </div>
      ))}
      <div className={styles.settingsButtons}>
        <Button type="danger" onClick={cancelSettings}>
          Cancel
        </Button>
        <Button type="primary" onClick={applySettings}>
          Apply
        </Button>
      </div>
    </>
  );

  return (
    <>
      <Badge count={unreadEventsCount} offset={[-8, 8]}>
        <Icon
          type="bell"
          theme="filled"
          className={classNames(styles.icon, styles.notificationBell)}
          onClick={() => setShowEvents(true)}
        />
        <div>Notifications</div>
      </Badge>
      <Modal
        title={modalHeader}
        visible={showEvents}
        mask={false}
        footer={null}
        onCancel={closeModal}
        closable={false}
        wrapClassName="notification-modal"
      >
        {showSettings ? settingsPage : renderEventsPage()}
      </Modal>
    </>
  );
}
