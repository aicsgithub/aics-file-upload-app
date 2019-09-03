import * as React from "react";

import * as classNames from "classnames";

const styles = require("./styles.pcss");

interface Props {
    className?: string;
    key?: string;
    saveValue: (value: boolean, key?: string, row?: any) => void;
    row?: any;
    value?: boolean;
}

const BooleanFormatter: React.FunctionComponent<Props> = ({className, row, value, key, saveValue}: Props) => {
    const onClickHandler = () => saveValue(!value, key, row);
    return (
        <div
            className={classNames(className, styles.boolean, value ? styles.true : styles.false)}
            onClick={onClickHandler}
        >
            {value ? "Yes" : "No"}
        </div>
    );
};

export default BooleanFormatter;
