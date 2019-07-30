import { Icon, Popover } from "antd";
import { isEmpty } from "lodash";
import * as React from "react";
import { ColumnType } from "../../../state/setting/types";
import FormControl from "../../FormControl";
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
        const popoverContent = !isEmpty(value.dropdownValues) ? (
            <div className={styles.popoverBody}>
                {value.dropdownValues.map((option) => (
                    <div className={styles.dropdownValue} key={option}>{option}</div>
                ))}
            </div>
        ) : null;

        return (
            <FormControl
                className={styles.container}
                error={popoverContent ? undefined : "Dropdown values are required"}
            >
                <div className={styles.type}>{COLUMN_TYPE_DISPLAY_MAP[value.type]}</div>
                {popoverContent && <Popover
                    className={styles.popover}
                    content={popoverContent}
                    title="Dropdown values"
                    trigger="hover"
                >
                    <Icon type="info-circle"/>
                </Popover>}
            </FormControl>
        );
    }

    return (
        <div className={styles.container}>
            {COLUMN_TYPE_DISPLAY_MAP[value.type]}
        </div>
    );
};

export default ColumnTypeFormatter;
