import { Switch } from "antd";
import React from "react";

import AlertIcon from "../../components/AlertIcon";
import { AlertType } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
  label: string;
  iconType: AlertType;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
}

export default function SettingToggle(props: Props) {
  return (
    <div key={props.label} className={styles.settingsContainer}>
      <div className={styles.settingLabel}>
        <AlertIcon type={props.iconType} />
        &nbsp;{props.label}
      </div>
      <div className={styles.toggle}>
        <Switch checked={props.isChecked} onChange={props.onChange} />
      </div>
    </div>
  );
}
