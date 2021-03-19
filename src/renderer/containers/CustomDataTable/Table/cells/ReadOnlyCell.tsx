import { Tooltip } from "antd";
import React from "react";

import { CustomCell } from "../../types";

const styles = require("../styles.pcss");

/*
    TODO
*/
export default function ReadOnlyCell(props: CustomCell) {
  return (
    <Tooltip title={props.value}>
      <input readOnly className={styles.readOnlyCell} value={props.value} />
    </Tooltip>
  );
}
