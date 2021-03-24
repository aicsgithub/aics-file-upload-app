import { Checkbox } from "antd";
import React from "react";

import { CustomCell } from "../../DefaultCells/DisplayCell";

const styles = require("./styles.pcss");

/*
    This renders a checkbox that controls the selection state
    of an individual row.
*/
export default function SelectionCell({ row }: CustomCell) {
  return (
    <div className={styles.checkboxContainer}>
      <Checkbox {...row.getToggleRowSelectedProps()} />
    </div>
  );
}
