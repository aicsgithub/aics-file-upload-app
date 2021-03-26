import { Icon, Tooltip } from "antd";
import React from "react";

import { CustomCell } from "../../DefaultCells/DisplayCell";

const styles = require("./styles.pcss");

interface Props extends CustomCell {
  name?: string;
}

/*
  This component renders an interactive header rendered by default for
  all react-tables.
*/
export default function DefaultHeader({ column, name }: Props) {
  return (
    <Tooltip title={column.description}>
      <div className={styles.header}>
        {name || column.id} {column.isRequired && "* "}
        {column.isSorted && (
          <Icon type={column.isSortedDesc ? "caret-down" : "caret-up"} />
        )}
      </div>
    </Tooltip>
  );
}
