import { Tooltip } from "antd";
import React from "react";

import { CustomCell } from "../types";

const styles = require("./styles.pcss");

export default function DefaultHeader({ column }: CustomCell) {
  return (
    <Tooltip title={column.description}>
      <div className={styles.header}>{column.id}</div>
    </Tooltip>
  );
}
