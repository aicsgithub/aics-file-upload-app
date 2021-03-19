import { Checkbox, Input, Select, Tooltip } from "antd";
import classNames from "classnames";
import React from "react";
import { useDispatch } from "react-redux";

import { ColumnType } from "../../../../services/labkey-client/types";
import { updateUpload } from "../../../../state/upload/actions";
import LookupSearch from "../../../LookupSearch";
import { CustomCell } from "../../types";

import DisplayCell from "./DisplayCell";

const styles = require("../styles.pcss");

const { Option } = Select;

const INITIAL_DURATION = { days: "0", hours: "0", minutes: "0", seconds: "0" };

export default function DefaultCell(props: CustomCell) {
  const dispatch = useDispatch();
  const initialValue = props.value;
  const [value, setValue] = React.useState(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);

  // MassEditing or pasting will result in an external update
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (!isEditing) {
    return <DisplayCell {...props} onStartEditing={() => setIsEditing(true)} />;
  }

  function onStopEditing() {
    setIsEditing(false);
    if (value !== props.value) {
      dispatch(updateUpload(props.row.id, { [props.column.id]: value }));
    }
  }

  function onBlur(event: React.FocusEvent) {
    // The duration editor has multiple inputs within itself
    // we only want to trigger this if it is going to the next cell
    if (
      props.column.type !== ColumnType.DURATION ||
      (event.relatedTarget instanceof Node &&
        !event.currentTarget.contains(event.relatedTarget))
    ) {
      onStopEditing();
    }
  }

  switch (props.column.type) {
    case ColumnType.BOOLEAN:
      return (
        <div className={styles.checkboxContainer} onBlur={onBlur}>
          <Checkbox
            autoFocus
            checked={value[0]}
            onChange={() => setValue([!value[0]])}
          />
        </div>
      );
    case ColumnType.DATE:
    case ColumnType.DATETIME:
      return <div onBlur={onBlur}>TBD</div>;
    case ColumnType.DURATION: {
      const duration = value.length ? value : [{ ...INITIAL_DURATION }];
      return (
        <Input.Group
          compact
          className={classNames(styles.defaultCell, styles.durationInput)}
          onBlur={onBlur}
        >
          <Tooltip visible title="D">
            <Input
              autoFocus
              value={duration[0].days}
              onChange={(e) =>
                setValue([{ ...duration[0], days: e.target.value }])
              }
            />
          </Tooltip>
          <Tooltip visible title="H">
            <Input
              value={duration[0].hours}
              onChange={(e) =>
                setValue([{ ...duration[0], hours: e.target.value }])
              }
            />
          </Tooltip>
          <Tooltip visible title="M">
            <Input
              value={duration[0].minutes}
              onChange={(e) =>
                setValue([{ ...duration[0], minutes: e.target.value }])
              }
            />
          </Tooltip>
          <Tooltip visible title="S">
            <Input
              value={duration[0].seconds}
              onChange={(e) =>
                setValue([{ ...duration[0], seconds: e.target.value }])
              }
            />
          </Tooltip>
        </Input.Group>
      );
    }
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
          {props.column.dropdownValues?.map((dropdownValue: string) => (
            <Option key={dropdownValue}>{dropdownValue}</Option>
          ))}
        </Select>
      );
    case ColumnType.LOOKUP:
      return (
        <LookupSearch
          className={styles.defaultCell}
          onBlur={onStopEditing}
          defaultOpen={true}
          mode="multiple"
          lookupAnnotationName={props.column.id}
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
          onChange={(e) =>
            setValue(e.target.value.split(",").map((v) => v.trim()))
          }
          value={value.join(", ")}
        />
      );
    default:
      // Error-case shouldn't occur
      console.error("Invalid column type", props.column.type);
      return null;
  }
}
