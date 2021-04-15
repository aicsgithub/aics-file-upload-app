import { Tooltip } from "antd";
import { castArray } from "lodash";
import React from "react";
import { CellProps } from "react-table";

import { UploadJobTableRow } from "../../../../state/upload/types";
import { useDisplayValue } from "../DisplayCell";

const styles = require("./styles.pcss");

/*
  This component renders a read only text display showcasing the data
  for this particular cell. Features like cell-dragging are N/A.
*/
export default function ReadOnlyCell(props: CellProps<UploadJobTableRow>) {
  const displayValue = useDisplayValue(
    castArray(props.value),
    props.column.type
  );
  return (
    <Tooltip
      arrowPointAtCenter
      autoAdjustOverflow
      mouseLeaveDelay={0}
      title={displayValue}
    >
      <input readOnly className={styles.readOnlyCell} value={displayValue} />
    </Tooltip>
  );
}
