import { Tooltip } from "antd";
import React from "react";

import { CustomCell } from "../DisplayCell/DisplayCell";

const styles = require("./styles.pcss");

/*
    This component renders a read only text display showcasing the data
    for this particular cell. Features like cell-dragging are N/A.
*/
export default function ReadOnlyCell(props: CustomCell) {
  return (
    <Tooltip title={props.value}>
      <input readOnly className={styles.readOnlyCell} value={props.value} />
    </Tooltip>
  );
}
