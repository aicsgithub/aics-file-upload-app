import * as classNames from "classnames";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
    className?: string;
}

const EmptyColumnDefinitionRow: React.FunctionComponent<Props> = ({className}: Props) => (
    <div className={classNames(styles.container, className)}>
        <div className={styles.columnName}/>
        <div className={styles.columnType}/>
    </div>
);

export default EmptyColumnDefinitionRow;
