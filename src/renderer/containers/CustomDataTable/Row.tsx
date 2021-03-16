import React from "react";
import { Row } from "react-table";

import Cell from "./Cell";

interface Props {
  row: Row;
}

export default function Row(props: Props) {
  return (
    <tr {...props.row.getRowProps()} key={props.row.getRowProps().key}>
      {props.row.cells.map((cell) => (
        <Cell cell={cell} key={cell.getCellProps().key} />
      ))}
    </tr>
  );
}
