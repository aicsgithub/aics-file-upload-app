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
  const { tableInstance } = props;

  const RenderRow = useCallback(
    ({ index, style }) => {
      const row = tableInstance.rows[index];
      tableInstance.prepareRow(row);
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
    [tableInstance]
  );

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
        <tbody {...tableInstance.getTableBodyProps()}>
          <List
            height={400}
            itemCount={tableInstance.rows.length}
            itemSize={35}
            width={tableInstance.totalColumnsWidth}
          >
            {RenderRow}
          </List>
        </tbody>
      </table>
    </div>
  );
}
