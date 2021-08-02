import { Icon, Tooltip } from "antd";
import * as React from "react";
import { HeaderProps } from "react-table";

const styles = require("./styles.pcss");

/*
  This component renders an interactive header rendered by default for
  all react-tables.
*/
export default function DefaultHeader<T extends {}>({
  column,
  name,
}: HeaderProps<T>) {
  return (
    <Tooltip
      title={column.description}
      mouseEnterDelay={0.5}
      mouseLeaveDelay={0}
    >
      <div className={styles.header}>
        {name || column.id} {column.isRequired && "* "}
        {column.isSorted && (
          <Icon type={column.isSortedDesc ? "caret-down" : "caret-up"} />
        )}
      </div>
    </Tooltip>
  );
}
