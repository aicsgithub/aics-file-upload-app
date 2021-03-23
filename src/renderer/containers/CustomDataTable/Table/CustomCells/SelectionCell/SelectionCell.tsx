import { Checkbox } from "antd";
import React from "react";

const styles = require("./styles.pcss");

export default function SelectionCell(props: {}) {
  return (
    <div className={styles.checkboxContainer}>
      <Checkbox {...props} />
    </div>
  );
}
