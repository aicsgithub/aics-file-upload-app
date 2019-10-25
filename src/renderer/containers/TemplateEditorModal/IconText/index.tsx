import { Icon } from "antd";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
    className?: string;
    icon: string;
    onClick?: () => void;
    text: string;
}

const IconText: React.FunctionComponent<Props> = ({className, icon, onClick, text}: Props) => (
    <div onClick={onClick} className={className}>
        <Icon type={icon}/>
        <span className={styles.text}>{text}</span>
    </div>
);

export default IconText;
