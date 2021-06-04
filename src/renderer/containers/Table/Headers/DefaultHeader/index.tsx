import { Icon, Tooltip } from "antd";
import React from "react";
import { HeaderProps } from "react-table";

import { UploadTableRow } from "../../../../state/upload/types";

const styles = require("./styles.pcss");

/*
  This component renders an interactive header rendered by default for
  all react-tables.
*/
export default function DefaultHeader({
  column,
  name,
}: HeaderProps<UploadTableRow>) {
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
