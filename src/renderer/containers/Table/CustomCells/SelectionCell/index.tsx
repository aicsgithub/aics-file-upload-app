import { Checkbox } from "antd";
import React from "react";
import { CellProps } from "react-table";

import { UploadTableRow } from "../../../../state/upload/types";

const styles = require("./styles.pcss");

/*
    This renders a checkbox that controls the selection state
    of an individual row.
*/
export default function SelectionCell({ row }: CellProps<UploadTableRow>) {
  return (
    <div className={styles.checkboxContainer}>
      <Checkbox {...(row.getToggleRowSelectedProps() as any)} />
    </div>
  );
}
