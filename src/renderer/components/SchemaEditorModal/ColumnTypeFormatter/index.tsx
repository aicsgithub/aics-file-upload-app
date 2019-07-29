import { Select } from "antd";
import * as React from "react";
import { ColumnType } from "../../../state/setting/types";
import { COLUMN_TYPE_DISPLAY_MAP } from "../index";

const styles = require("./styles.pcss");

interface Props {
    value?: {
        dropdownValues: string[];
        type: ColumnType;
    };
}

const ColumnTypeFormatter: React.FunctionComponent<Props> = ({value}: Props) => {
    if (!value) {
        return null;
    }

    if (value.type === ColumnType.DROPDOWN) {
        return (
            <div className={styles.container}>
                <div className={styles.type}>{COLUMN_TYPE_DISPLAY_MAP[value.type]}</div>
                <Select
                    value={value.dropdownValues}
                    className={styles.values}
                    mode="tags"
                    placeholder="Dropdown values"
                    disabled={true}
                />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {COLUMN_TYPE_DISPLAY_MAP[value.type]}
        </div>
    );
}

export default ColumnTypeFormatter;
