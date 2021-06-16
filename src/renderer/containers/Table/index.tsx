import React from "react";
import { HeaderGroup, TableInstance } from "react-table";

import { UploadTableRow } from "../../state/upload/types";

const styles = require("./styles.pcss");

/*
  This stateless component renders a table meant for connecting to
  and utilizing a react-table instance through interactive hooks.
  The "Header" & "Cell" rendered are determined by the Header & Cell
  properties of the column definition supplied for that column or
  by the defaultColumn properties supplied to react-table.
*/
export default function Table(props: {
  tableInstance: TableInstance<UploadTableRow>;
}) {
  const { tableInstance } = props;
  return (
    <div className={styles.tableContainer}>
      <table
        className={styles.tableContainer}
        {...tableInstance.getTableProps()}
      >
        <thead>
          {tableInstance.headerGroups.map((headerGroup) => (
            <tr
              {...headerGroup.getHeaderGroupProps()}
              key={headerGroup.getHeaderGroupProps().key}
            >
              {headerGroup.headers.map(
                (column: HeaderGroup<UploadTableRow>) => (
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
        <tbody {...tableInstance.getTableBodyProps()}>
          {tableInstance.rows.map((row) => {
            tableInstance.prepareRow(row);
            return (
              <tr {...row.getRowProps()} key={row.getRowProps().key}>
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
          })}
        </tbody>
      </table>
    </div>
  );
}
