import { Checkbox, Input, InputNumber, Select, Tooltip } from "antd";
import React from "react";
import { Cell as CellType, Column, Row } from "react-table";

import { ColumnType } from "../../services/labkey-client/types";
import LookupSearch from "../LookupSearch";

const { Option } = Select;

interface CustomRow extends Row {
  original: any;

  // These props come from using the useExpanded plugin
  canExpand: boolean;
  depth: number;
  isExpanded: boolean;
  getToggleRowExpandedProps: (props: any) => void;
}

export type CustomColumn = Column & {
  description?: string;
  dropdownValues?: string[];
  editable?: boolean;
  type?: ColumnType;
};

export type CustomCell = CellType & {
  row: CustomRow;
  column: CustomColumn;
  onCellUpdate: (rowId: string, columnId: string, value: any) => void;
};

export default function Cell({
  value: initialValue,
  row: {
    original: { rowId },
  },
  column: { id, type, editable, dropdownValues },
  onCellUpdate, // This is a custom function that we supplied to our table instance
}: CustomCell) {
  const [value, setValue] = React.useState<any[] | undefined>(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);

  function onBlur() {
    setIsEditing(false);
    onCellUpdate(rowId, id, value);
  }

  if (!isEditing || !editable) {
    return (
      <Tooltip title={`${value}`}>
        <div
          onBlur={onBlur}
          onDoubleClick={() => setIsEditing(true)}
          style={{
            height: "30px",
            width: "100px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {editable && (
            <input
              onFocus={() => setIsEditing(true)}
              style={{ border: "none", height: 0, width: 0 }}
            />
          )}
          {`${value}`}
        </div>
      </Tooltip>
    );
  }

  switch (type) {
    case ColumnType.BOOLEAN:
      return (
        <div onBlur={onBlur} style={{ display: "flex", width: "100%" }}>
          <Checkbox
            autoFocus
            checked={Boolean(value)}
            onChange={() => value && setValue([!value[0]])}
            style={{ width: "100%", margin: "auto" }}
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
          allowClear={true}
          autoFocus={true}
          defaultOpen={true}
          mode="multiple"
          onBlur={onBlur}
          onChange={setValue}
          value={value as any}
          style={{ borderRadius: "unset", boxShadow: "none", width: "100%" }}
        >
          {dropdownValues?.map((dropdownValue: string) => (
            <Option key={dropdownValue}>{dropdownValue}</Option>
          ))}
        </Select>
      );
    case ColumnType.LOOKUP:
      return (
        <LookupSearch
          onBlur={onBlur}
          defaultOpen={true}
          mode="multiple"
          lookupAnnotationName={id}
          selectSearchValue={setValue}
          value={value}
        />
      );
    case ColumnType.NUMBER:
      return (
        <InputNumber
          onBlur={onBlur}
          onChange={(v) => v && setValue(v as any)}
          value={value as any}
          style={{ borderRadius: "unset", boxShadow: "none", width: "100%" }}
        />
      );
    case ColumnType.TEXT:
      return (
        <Input
          autoFocus
          onBlur={onBlur}
          onChange={(e) => setValue(e.target.value as any)}
          value={value as any}
          style={{ borderRadius: "unset", boxShadow: "none", width: "100%" }}
        />
      );
    default:
      // Error-case shouldn't occur
      console.error("Invalid column type", type);
      return null;
  }
}
