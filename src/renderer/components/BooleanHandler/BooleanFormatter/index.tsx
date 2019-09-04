import * as React from "react";

import * as classNames from "classnames";

const styles = require("./styles.pcss");

interface Props {
    className?: string;
    rowKey?: string;
    saveValue: (value: boolean, key?: string, row?: any) => void;
    row?: any;
    value?: boolean;
}

const BooleanFormatter: React.FunctionComponent<Props> = ({className, row, value, rowKey, saveValue}: Props) => {
    const onClickHandler = () => saveValue(!value, rowKey, row);
    return (
        <input
            readOnly={true}
            className={classNames(styles.boolean, value ? styles.true : styles.false, className)}
            onClick={onClickHandler}
            value={value ? "Yes" : "No"}
        />
    );
};

export default BooleanFormatter;
