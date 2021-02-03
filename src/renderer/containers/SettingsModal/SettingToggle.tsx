import { Icon, Switch } from "antd";
import classNames from "classnames";
import React from "react";

import { AlertType } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
  label: string;
  iconType: AlertType;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
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

function getIcon(type: AlertType) {
  return <Icon theme="filled" {...iconPropsLookup[type]} />;
}

export default function SettingToggle(props: Props) {
  return (
    <div key={props.label} className={styles.settingsContainer}>
      <div className={styles.settingLabel}>
        {getIcon(props.iconType)} {props.label}
      </div>
      <div className={styles.toggle}>
        <Switch checked={props.isChecked} onChange={props.onChange} />
      </div>
    </div>
  );
}
