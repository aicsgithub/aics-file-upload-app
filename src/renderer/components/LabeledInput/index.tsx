import * as classNames from "classnames";
import { ReactNode, ReactNodeArray } from "react";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
    children: ReactNode | ReactNodeArray;
    className?: string;
    label: string;
}

const LabeledInput: React.FunctionComponent<Props> = ({children, className, label}: Props) => (
    <div className={classNames(styles.container, className)}>
        <div className={styles.label}>{label}</div>
        {children}
    </div>
);

export default LabeledInput;
