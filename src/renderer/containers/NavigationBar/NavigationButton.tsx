import { Button, Icon } from "antd";
import classNames from "classnames";
import React from "react";

const styles = require("./styles.pcss");

interface Props {
  icon: string;
  iconTheme?: "filled" | "outlined";
  isSelected: boolean;
  onSelect: () => void;
  title: string;
}

export default function NavigationButton(props: Props) {
  return (
    <Button
      className={classNames(
        styles.button,
        props.isSelected ? styles.selectedButton : undefined
      )}
      onClick={() => !props.isSelected && props.onSelect()}
    >
      <Icon
        className={styles.buttonIcon}
        type={props.icon}
        theme={props.iconTheme}
      />
      <p className={styles.buttonTitle}>{props.title}</p>
    </Button>
  );
}
