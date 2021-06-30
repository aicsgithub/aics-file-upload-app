import { Checkbox, DatePicker, Icon, Input, Popover } from "antd";
import { debounce, without } from "lodash";
import moment from "moment";
import * as React from "react";
import { FilterProps } from "react-table";

const styles = require("./styles.pcss");

export enum FilterType {
  DATE = "DATE",
  SELECTION = "SELECTION",
  TEXT = "TEXT",
}

interface Props {
  options?: string[];
  type: FilterType;
}

export default function Filter(props: Props) {
  return <T extends {}>(filterProps: FilterProps<T>) => {
    let content: React.ReactNode;
    if (props.type === FilterType.DATE) {
      content = (
        <DatePicker
          value={moment(filterProps.column.filterValue)}
          onChange={(v) =>
            filterProps.column.setFilter(v?.toDate())
          }
          placeholder={`Search by ${filterProps.column.id}`}
        />
      );
    } else if (props.type === FilterType.SELECTION) {
      content = (
        <div className={styles.selectionMenu}>
          {props.options?.map((option) => (
            <Checkbox
              key={option}
              checked={filterProps.column.filterValue?.includes(option)}
              onChange={(e) =>
                e.target.checked
                  ? filterProps.column.setFilter([...(filterProps.column.filterValue || []), option])
                  : filterProps.column.setFilter(without(filterProps.column.filterValue, option))
              }
            >
              {option}
            </Checkbox>
          ))}
        </div>
      );
    } else {
        const onUpdate = debounce((value: string) => {
            filterProps.column.setFilter(value);
        })
        function onChange(e: React.ChangeEvent<HTMLInputElement>) {
            e.persist();
            onUpdate(e.target.value);
        }
      content = (
        <Input
            allowClear
          defaultValue={filterProps.column.filterValue}
          onChange={onChange}
          placeholder={`Search by ${filterProps.column.id}`}
        />
      );
    }

    return (
      <Popover content={content}>
        <Icon
          className={styles.filter}
          title={`Filter by ${filterProps.column.id}`}
          type="filter"
          theme={filterProps.column.filterValue !== undefined ? "filled" : "outlined"}
        />
      </Popover>
    );
  };
}
