import { Icon, Tooltip } from "antd";
import * as classNames from "classnames";
import { ReactNode, ReactNodeArray } from "react";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
    children?: ReactNode | ReactNodeArray;
    className?: string;
    error?: string;
    onClick?: () => void;
}

const FormControl: React.FunctionComponent<Props> = ({
                                                       children,
                                                       className,
                                                       error,
                                                       onClick,
}: Props) => (
    <div
        className={classNames(
            styles.container,
            {[styles.error]: error},
            className
        )}
        onClick={onClick}
    >
        <div className={styles.form}>
            {children}
        </div>
        {error && <Tooltip title={error} className={styles.errorIcon} >
            <Icon type="close-circle" theme="filled" />
        </Tooltip>}
    </div>
);

export default FormControl;
