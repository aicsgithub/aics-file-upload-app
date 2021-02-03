import { Icon } from "antd";
import classNames from "classnames";
import React from "react";

import { AlertType } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
  type: AlertType;
}

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

export default function AlertIcon({ type }: Props) {
  return <Icon theme="filled" {...iconPropsLookup[type]} />;
}
