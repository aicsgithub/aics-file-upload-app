import * as React from "react";

import * as classNames from "classnames";

const styles = require("./styles.pcss");

interface Props {
    value?: boolean;
    className?: string;
}

const BooleanFormatter: React.FunctionComponent<Props> = ({ value, className}) => {
    return (
        <input
            readOnly={true}
            className={classNames(styles.boolean, value ? styles.true : styles.false, className)}
            value={value ? "Yes" : "No"}
        />
    );
};

export default BooleanFormatter;
