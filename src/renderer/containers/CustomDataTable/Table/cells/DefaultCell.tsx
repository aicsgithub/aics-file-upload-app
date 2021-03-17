import { Checkbox, Input, Select, Tooltip } from "antd";
import React from "react";
import { useDispatch } from "react-redux";

import { ColumnType } from "../../../../services/labkey-client/types";
import { updateUploadRowValue } from "../../../../state/upload/actions";
import LookupSearch from "../../../LookupSearch";
import { CustomCell } from "../../types";

const styles = require("../styles.pcss");

const { Option } = Select;

export default function DefaultCell({
  value: initialValue,
  row: {
    original: { rowId },
  },
  column: { id: columnId, type, isReadOnly, dropdownValues },
}: CustomCell) {
  const dispatch = useDispatch();
  const [value, setValue] = React.useState(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);

  function onBlur() {
    setIsEditing(false);
    if (value !== initialValue) {
      dispatch(updateUploadRowValue(rowId, columnId, value));
    }
  }

  if (!isEditing || isReadOnly) {
    return (
      <Tooltip title={`${value}`}>
        <div
          className={styles.readOnlyCell}
          onBlur={onBlur}
          onDoubleClick={() => setIsEditing(true)}
        >
          {!isReadOnly && (
            <input
              className={styles.hidden}
              onFocus={() => setIsEditing(true)}
            />
          )}
          {`${value}`}
        </div>
      </Tooltip>
    );
  }
  console.log(type, initialValue, value);

  switch (type) {
    case ColumnType.BOOLEAN:
      return (
        <div onBlur={onBlur} style={{ display: "flex", width: "100%" }}>
          <Checkbox
            autoFocus
            checked={Boolean(value)}
            onChange={() => value && setValue([!value[0]])}
          />
        </div>
      );
    case ColumnType.DATE:
    case ColumnType.DATETIME:
      return <div onBlur={onBlur}>TBD</div>;
    case ColumnType.DURATION:
      return (
        <Input.Group compact onBlur={onBlur}>
          <Input autoFocus value={0} addonAfter="D" />
          <Input value={0} addonAfter="H" />
          <Input value={0} addonAfter="M" />
          <Input value={0} addonAfter="S" />
        </Input.Group>
      );
    case ColumnType.DROPDOWN:
      return (
        <Select
          autoFocus
          allowClear
          defaultOpen
          className={styles.defaultCell}
          mode="multiple"
          onBlur={onBlur}
          onChange={setValue}
          value={value}
        >
          {dropdownValues?.map((dropdownValue: string) => (
            <Option key={dropdownValue}>{dropdownValue}</Option>
          ))}
        </Select>
      );
    case ColumnType.LOOKUP:
      return (
        <LookupSearch
          className={styles.defaultCell}
          onBlur={onBlur}
          defaultOpen={true}
          mode="multiple"
          lookupAnnotationName={columnId}
          selectSearchValue={setValue}
          value={value}
        />
      );
    case ColumnType.NUMBER:
    case ColumnType.TEXT:
      return (
        <Input
          autoFocus
          className={styles.defaultCell}
          onBlur={onBlur}
          onChange={(e) => setValue(e.target.value as any)}
          value={value}
        />
      );
    default:
      // Error-case shouldn't occur
      console.error("Invalid column type", type);
      return null;
  }
}
