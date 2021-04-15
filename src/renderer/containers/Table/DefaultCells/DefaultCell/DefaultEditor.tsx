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
import moment from "moment";
import React from "react";
import { ColumnInstance } from "react-table";

import { DATETIME_FORMAT, DATE_FORMAT } from "../../../../constants";
import { ColumnType } from "../../../../services/labkey-client/types";
import { UploadJobTableRow } from "../../../../state/upload/types";
import { Duration } from "../../../../types";
import LookupSearch from "../../../LookupSearch";
import { ColumnValue } from "../../types";

const styles = require("./styles.pcss");

const { Option } = Select;

const INITIAL_DURATION = { days: 0, hours: 0, minutes: 0, seconds: 0 };

interface Props {
  value: ColumnValue;
  column: ColumnInstance<UploadJobTableRow>;
  initialValue: ColumnValue;
  setValue: (value: ColumnValue) => void;
  onStopEditing: () => void;
}

/*
    This is the default editor component for cells, unless overridden
    somehow per its column properties supplied to react-table this is the
    component rendered while editing.
*/
export default function DefaultEditor(props: Props) {
  function onBlur(event: React.FocusEvent) {
    // The duration editor has multiple inputs within itself
    // we only want to trigger this if it is going to the next cell
    if (
      props.column.type !== ColumnType.DURATION ||
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      props.onStopEditing();
    }
  }

  function onCancel() {
    props.onStopEditing();
    props.setValue(props.initialValue);
  }

  const duration = props.value.length
    ? (props.value[0] as Duration)
    : { ...INITIAL_DURATION };
  function onDurationChange(
    key: "days" | "hours" | "minutes" | "seconds",
    input: string
  ) {
    let value = 0;
    if (input) {
      const inputAsNumber = Number(input);
      value = isNaN(inputAsNumber) ? duration[key] : inputAsNumber;
    }
    props.setValue([{ ...duration, [key]: value }]);
  }

  switch (props.column.type) {
    case ColumnType.BOOLEAN:
      return (
        <div className={styles.checkboxContainer} onBlur={onBlur}>
          <Checkbox
            autoFocus
            checked={props.value[0] as boolean}
            onChange={() => props.setValue([!props.value[0]])}
          />
        </div>
      );
    case ColumnType.DATE:
    case ColumnType.DATETIME: {
      const dates = (props.value.length ? props.value : [undefined]) as (
        | Date
        | undefined
      )[];
      return (
        <Modal
          visible
          okText="Save"
          onCancel={onCancel}
          onOk={props.onStopEditing}
          title={`Adjust ${props.column.id}`}
          width="50%"
        >
          {dates.map((date, index) => (
            <div key={date?.toString() || ""} className={styles.dateInput}>
              <Tooltip title={date ? "Delete this date" : ""}>
                <Icon
                  className={date ? undefined : styles.hidden}
                  type="delete"
                  onClick={() =>
                    props.setValue([
                      ...props.value.slice(0, index),
                      ...props.value.slice(index + 1),
                    ] as Date[])
                  }
                />
              </Tooltip>
              <DatePicker
                autoFocus
                allowClear={false}
                className={styles.datePicker}
                showTime={props.column.type === ColumnType.DATETIME}
                placeholder="Add a Date"
                value={date ? moment(date) : undefined}
                onChange={(d) =>
                  props.setValue([
                    ...props.value.slice(0, index),
                    d?.toDate(),
                    ...props.value.slice(index + 1),
                  ] as Date[])
                }
                format={
                  props.column.type === ColumnType.DATETIME
                    ? DATETIME_FORMAT
                    : DATE_FORMAT
                }
              />
            </div>
          ))}
          <Button
            className={styles.datePlusButton}
            disabled={
              !props.value.length || !props.value[props.value.length - 1]
            }
            icon="plus"
            onClick={() =>
              props.setValue([...props.value, undefined] as Date[])
            }
          />
        </Modal>
      );
    }
    case ColumnType.DURATION:
      return (
        <Input.Group
          compact
          className={classNames(styles.defaultInput, styles.durationInput)}
          onBlur={onBlur}
        >
          <Input
            autoFocus
            addonAfter="D"
            value={duration.days}
            onChange={(e) => onDurationChange("days", e.target.value)}
          />
          <Input
            addonAfter="H"
            value={duration.hours}
            onChange={(e) => onDurationChange("hours", e.target.value)}
          />
          <Input
            addonAfter="M"
            value={duration.minutes}
            onChange={(e) => onDurationChange("minutes", e.target.value)}
          />
          <Input
            addonAfter="S"
            value={duration.seconds}
            onChange={(e) => onDurationChange("seconds", e.target.value)}
          />
        </Input.Group>
      );
    case ColumnType.DROPDOWN:
      return (
        <Select
          autoFocus
          allowClear
          defaultOpen
          className={styles.defaultInput}
          mode="multiple"
          onBlur={onBlur}
          onChange={(v: any) => props.setValue(v as string[])}
          value={props.value as any}
        >
          {props.column.dropdownValues?.map((dropdownValue: string) => (
            <Option key={dropdownValue}>{dropdownValue}</Option>
          ))}
        </Select>
      );
    case ColumnType.LOOKUP:
      return (
        <LookupSearch
          defaultOpen
          className={styles.defaultInput}
          onBlur={props.onStopEditing}
          mode="multiple"
          lookupAnnotationName={props.column.id}
          selectSearchValue={props.setValue}
          value={props.value as string[]}
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
            props.setValue(e.target.value.split(",").map((v) => v.trim()))
          }
          value={props.value.join(", ")}
        />
      );
    default:
      // Error-case shouldn't occur
      console.error("Invalid column type", props.column.type);
      return null;
  }
}
