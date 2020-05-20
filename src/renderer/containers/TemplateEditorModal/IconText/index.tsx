import { Icon } from "antd";
import * as classNames from "classnames";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
  className?: string;
  icon: string;
  onClick?: () => void;
  text: string;
  textClassName?: string;
}

const IconText: React.FunctionComponent<Props> = ({
  className,
  icon,
  onClick,
  text,
  textClassName,
}: Props) => (
  <div onClick={onClick} className={classNames(className, styles.container)}>
    <Icon type={icon} className={styles.icon} />
    <span className={classNames(styles.text, textClassName)}>{text}</span>
  </div>
);

export default IconText;
