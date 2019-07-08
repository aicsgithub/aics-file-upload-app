import { Statistic } from "antd";
import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.pcss");

export interface KeyValueDisplayProps {
    className?: string;
    keyName: string;
    value: string | number;
}

const KeyValueDisplay: React.FunctionComponent<KeyValueDisplayProps> = (props) => {
    const {
        className,
        keyName,
        value,
    } = props;

    return (
        <div className={classNames(styles.container, className)}>
           <Statistic title={keyName} value={value}/>
        </div>
    );
};

export default KeyValueDisplay;
