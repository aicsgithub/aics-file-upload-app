import * as classNames from "classnames";
import * as React from "react";

const styles = require("../style.css");

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
            <span className={styles.label}>{keyName}:&nbsp;</span>{value}
        </div>
    );
};

export default KeyValueDisplay;