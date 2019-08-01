import { Icon, Popover } from "antd";
import { isEmpty } from "lodash";
import * as React from "react";

import { ColumnType } from "../../../state/setting/types";

import FormControl from "../../FormControl";

import { COLUMN_TYPE_DISPLAY_MAP } from "../";

const styles = require("./styles.pcss");

interface Props {
    value?: {
        dropdownValues: string[];
        type: ColumnType;
    };
}

const ColumnTypeFormatter: React.FunctionComponent<Props> = ({value}: Props) => {
    if (!value) {
        return <FormControl error="Column Type is required"/>;
    }

    const { type, dropdownValues } = value;
    const isDropdown = type === ColumnType.DROPDOWN;

    const popoverContent = !isEmpty(dropdownValues) && (
        <div className={styles.popoverBody}>
            {dropdownValues.map((option) => (
                <div className={styles.dropdownValue} key={option}>{option}</div>
            ))}
        </div>
    );

    let error;
    if (!type) {
        error = "Column Type is required";
    }

    if (isDropdown && isEmpty(dropdownValues)) {
        error = "Dropdown values are required";
    }

    return (
        <FormControl className={styles.container} error={error}>
            {COLUMN_TYPE_DISPLAY_MAP[type]}

            {isDropdown && popoverContent && <Popover
                className={styles.popover}
                content={popoverContent}
                title="Dropdown values"
                trigger="hover"
            >
                <Icon type="info-circle"/>
            </Popover>}
        </FormControl>
    );
};

export default ColumnTypeFormatter;
