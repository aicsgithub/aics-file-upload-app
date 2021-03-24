import { basename } from "path";

import {
  Button,
  Checkbox,
  DatePicker,
  Icon,
  Input,
  Modal,
  Select,
  Tooltip,
} from "antd";
import classNames from "classnames";
import { isNil } from "lodash";
import moment from "moment";
import React from "react";
import { useDispatch } from "react-redux";

import { DATETIME_FORMAT, DATE_FORMAT } from "../../../../constants";
import { ColumnType } from "../../../../services/labkey-client/types";
import { updateUpload } from "../../../../state/upload/actions";
import LookupSearch from "../../../LookupSearch";
import DisplayCell, { CustomCell } from "../DisplayCell";

const styles = require("./styles.pcss");

const { Option } = Select;

const INITIAL_DURATION = { days: "0", hours: "0", minutes: "0", seconds: "0" };

/*
  This component is responsible by default for react-tables for
  displaying the value supplied as well as creating an interactive
  editor based on the column's annotation type
*/
export default function DefaultCell(props: CustomCell) {
  const dispatch = useDispatch();
  const initialValue = props.value;
  const [value, setValue] = React.useState(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);

  // MassEditing or pasting will result in an external update
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // During load state transitions the value isn't guaranteed to be anything
  if (!initialValue) {
    return null;
  }

  if (!isEditing) {
    return <DisplayCell {...props} onStartEditing={() => setIsEditing(true)} />;
  }

  function onStopEditing() {
    setIsEditing(false);
    if (value !== props.value) {
      dispatch(
        updateUpload(props.row.id, {
          [props.column.id]: value.filter((v: any[]) => !isNil(v)),
        })
      );
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

  function onCancel() {
    setIsEditing(false);
    setValue(initialValue);
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
      return (
        <Modal
          visible
          okText="Save"
          onCancel={onCancel}
          onOk={onStopEditing}
          title={`Adjust ${props.column.id} for ${basename(
            props.row.original.File
          )}`}
          width="50%"
        >
          {(value.length ? value : [undefined]).map(
            (date: Date | undefined, index: number) => (
              <div key={date?.toString() || ""} className={styles.dateInput}>
                <Tooltip title={date ? "Delete this date" : ""}>
                  <Icon
                    className={date ? undefined : styles.hidden}
                    type="delete"
                    onClick={() =>
                      setValue([
                        ...value.slice(0, index),
                        ...value.slice(index + 1),
                      ])
                    }
                  />
                </Tooltip>
                <DatePicker
                  autoFocus={true}
                  allowClear={false}
                  className={styles.datePicker}
                  showTime={props.column.type === ColumnType.DATETIME}
                  placeholder="Add a Date"
                  value={date ? moment(date) : undefined}
                  onChange={(d) =>
                    setValue([
                      ...value.slice(0, index),
                      d?.toString(),
                      ...value.slice(index + 1),
                    ])
                  }
                  format={
                    props.column.type === ColumnType.DATETIME
                      ? DATETIME_FORMAT
                      : DATE_FORMAT
                  }
                />
              </div>
            )
          )}
          <Button
            className={styles.datePlusButton}
            disabled={!value.length || !value[value.length - 1]}
            icon="plus"
            onClick={() => setValue([...value, undefined])}
          />
        </Modal>
      );
    case ColumnType.DURATION: {
      const duration = value.length ? value : [{ ...INITIAL_DURATION }];
      return (
        <Input.Group
          compact
          className={classNames(styles.defaultInput, styles.durationInput)}
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
          className={styles.defaultInput}
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
          className={styles.defaultInput}
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
          className={styles.defaultInput}
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
