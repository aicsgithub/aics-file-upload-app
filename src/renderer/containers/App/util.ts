import { every, isEmpty } from "lodash";

import { ColumnDefinition, ColumnType, SchemaDefinition } from "../../state/setting/types";

export const isColumnDefinition = (json: any): json is ColumnDefinition => {
    if (!json) {
        return false;
    }

    const labelIsValid = json.label && typeof json.label === "string";
    // In order to combine multiple fields into one editor, type was added as a object property with
    // the following properties: type and dropdownValues.
    const typeIsValid = json.type && json.type.type && json.type.type in ColumnType;
    const dropdownValuesValid = json.type && (json.type !== ColumnType.DROPDOWN || !isEmpty(json.type.dropdownValues));
    return Boolean(labelIsValid && typeIsValid && dropdownValuesValid);
};

export const isSchemaDefinition = (json: any): json is SchemaDefinition => {
    if (!json) {
        return false;
    }

    const hasColumns = !isEmpty(json.columns);
    if (!hasColumns) {
        return false;
    }

    const columnsAreValid = every(json.columns, isColumnDefinition);
    const validNotes = typeof json.notes === "string" || typeof json.notes === "undefined";
    return validNotes && columnsAreValid;
};
