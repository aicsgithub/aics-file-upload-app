import * as React from "react";

import * as classNames from "classnames";

const styles = require("./styles.pcss");

interface Props {
    className?: string;
    rowKey?: string;
    saveValue: (value: boolean, key?: string, row?: any) => void;
    row?: any;
    value: boolean[]; // will always be an array of length 0 or 1
}

const BooleanFormatter: React.FunctionComponent<Props> = ({className, row, value, rowKey, saveValue}: Props) => {
    const onClickHandler = () => saveValue(!value[0], rowKey, row);
    return (
        <input
            readOnly={true}
            className={classNames(styles.boolean, value[0] ? styles.true : styles.false, className)}
            onClick={onClickHandler}
            value={value[0] ? "Yes" : "No"}
        />
    );
};

export default BooleanFormatter;
