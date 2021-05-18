import React from "react";
import { useCallback } from "react";
import { HeaderGroup, TableInstance } from "react-table";
import { FixedSizeList as List } from "react-window";

import { UploadJobTableRow } from "../../state/upload/types";

const styles = require("./styles.pcss");

/*
  This stateless component renders a table meant for connecting to
  and utilizing a react-table instance through interactive hooks.
  The "Header" & "Cell" rendered are determined by the Header & Cell
  properties of the column definition supplied for that column or
  by the defaultColumn properties supplied to react-table.
*/
export default function Table(props: {
  tableInstance: TableInstance<UploadJobTableRow>;
}) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
    totalColumnsWidth,
  } = props.tableInstance;

  const RenderRow = useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);
      return (
        <tr {...row.getRowProps({ style })} key={row.getRowProps().key}>
          {row.cells.map((cell) => (
            <td
              {...cell.getCellProps()}
              className={styles.tableCell}
              key={cell.getCellProps().key}
            >
              {cell.render("Cell")}
            </td>
          ))}
        </tr>
      );
    },
    [prepareRow, rows]
  );

  return (
    <div className={styles.tableContainer}>
      <table className={styles.tableContainer} {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr
              {...headerGroup.getHeaderGroupProps()}
              key={headerGroup.getHeaderGroupProps().key}
            >
              {headerGroup.headers.map(
                (column: HeaderGroup<UploadJobTableRow>) => (
                  <th
                    {...column.getHeaderProps()}
                    className={styles.tableHeader}
                    key={column.getHeaderProps().key}
                  >
                    <div
                      {...(column.getResizerProps && column.getResizerProps())}
                      className={styles.columnResizer}
                    />
                    <div
                      {...(column.getSortByToggleProps &&
                        column.getSortByToggleProps())}
                    >
                      {column.render("Header")}
                    </div>
                  </th>
                )
              )}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          <List
            height={400}
            itemCount={rows.length}
            itemSize={35}
            width={totalColumnsWidth + 15 /* TODO scrollbar size*/}
          >
            {RenderRow}
          </List>
        </tbody>
      </table>
    </div>
  );
}
