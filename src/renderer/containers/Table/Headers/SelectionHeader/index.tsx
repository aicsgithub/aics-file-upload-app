import { Checkbox } from "antd";
import React from "react";

import { CustomCell } from "../../DefaultCells/DisplayCell";

const styles = require("./styles.pcss");

/*
  This renders a checkbox that controls the selection state
  of every row
*/
export default function SelectionHeader(props: CustomCell) {
  return (
    <div className={styles.checkboxContainer}>
      <Checkbox {...props.getToggleAllRowsSelectedProps()} />
    </div>
  );
}
