import { Tooltip } from "antd";
import React from "react";

import { CustomCell } from "./Cell";

export default function Header({ column }: CustomCell) {
  return (
    <Tooltip title={column.description}>
      <div>{column.id}</div>
    </Tooltip>
  );
}
