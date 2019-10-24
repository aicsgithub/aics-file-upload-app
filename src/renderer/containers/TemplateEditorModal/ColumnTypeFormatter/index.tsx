import { Icon, Popover } from "antd";
import { isEmpty } from "lodash";
import * as React from "react";

import FormControl from "../../../components/FormControl/index";
import { AnnotationTypeDraft, ColumnType } from "../../../state/template/types";

const styles = require("./styles.pcss");

interface Props {
    value?: AnnotationTypeDraft;
}

const ColumnTypeFormatter: React.FunctionComponent<Props> = ({value}: Props) => {
    if (!value) {
        return <FormControl error="Column Type is required"/>;
    }

    const {
        annotationOptions,
        lookupTable,
        name,
    } = value;
    const isDropdown = name === ColumnType.DROPDOWN;
    const isLookup = name === ColumnType.LOOKUP;

    let error;
    let popoverContent;
    if (!name) {
        error = "Column Type is required";
    }

    if (isDropdown) {
        if (annotationOptions && !isEmpty(annotationOptions)) {
            popoverContent = annotationOptions.map((option) => (
                <div className={styles.dropdownValue} key={option}>{option}</div>
            ));
        } else {
            error = "Dropdown values are required";
        }
    }

    if (isLookup) {
        if (lookupTable) {
            popoverContent = (
                <div className={styles.dropdownValue}>
                    <strong>Lookup Table</strong>: {lookupTable}
                </div>
            );
        } else {
            error = "Table and Column are required";
        }
    }

    const popover = (
        <div className={styles.popoverBody}>
            {popoverContent}
        </div>
    );

    return (
        <FormControl className={styles.container} error={error}>
            {name}

            {popoverContent && <Popover
                className={styles.popover}
                content={popover}
                title="Value"
                trigger="hover"
            >
                <Icon type="info-circle"/>
            </Popover>}
        </FormControl>
    );
};

export default ColumnTypeFormatter;
