import { Icon, Modal } from "antd";
import * as classNames from "classnames";
import * as moment from "moment";
import { useState } from "react";
import * as React from "react";
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
};

function formatDate(date: Date): string {
  return moment(date).format("MM/DD/YYYY [at] HH:mm A");
}

export default function NotificationViewer() {
  const events = useSelector(getEventsByNewest);
  const [showEvents, setShowEvents] = useState(false);

  const eventList = events.map((event) => (
    <div
      key={event.date.toISOString()}
      className={styles.notificationContainer}
    >
      <div className={styles.iconContainer}>
        <Icon theme="filled" {...iconPropsLookup[event.type]} />
      </div>
      <div className={styles.message}>{event.message}</div>
      <div className={styles.timestamp}>{formatDate(event.date)}</div>
    </div>
  ));

  return (
    <>
      <Icon
        type="bell"
        theme="filled"
        className={classNames(styles.icon, styles.notificationBell)}
        onClick={() => setShowEvents(true)}
      />
      <Modal
        title="Notifications"
        visible={showEvents}
        mask={false}
        footer={null}
        onCancel={() => setShowEvents(false)}
        wrapClassName="notification-modal"
      >
        {eventList}
      </Modal>
    </>
  );
}
