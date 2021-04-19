import { Checkbox } from "antd";
import React from "react";
import { HeaderProps } from "react-table";

import { UploadJobTableRow } from "../../../../state/upload/types";

const styles = require("./styles.pcss");

/*
  This renders a checkbox that controls the selection state
  of every row
*/
export default function SelectionHeader(props: HeaderProps<UploadJobTableRow>) {
  return (
    <div className={styles.checkboxContainer}>
      <Checkbox {...(props.getToggleAllRowsSelectedProps() as any)} />
    </div>
  );
}
