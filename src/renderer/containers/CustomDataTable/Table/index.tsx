import React from "react";
import { HeaderGroup, TableInstance } from "react-table";

const styles = require("./styles.pcss");

interface CustomHeaderGroup extends HeaderGroup {
  // This prop is defined by useSortedBy plugin
  getSortByToggleProps?: () => {};
}

export default function Table(props: { tableInstance: TableInstance }) {
  const { tableInstance } = props;
  return (
    <div className={styles.tableContainer}>
      <table {...tableInstance.getTableProps()}>
        <thead>
          {tableInstance.headerGroups.map((headerGroup) => (
            <tr
              {...headerGroup.getHeaderGroupProps()}
              key={headerGroup.getHeaderGroupProps().key}
            >
              {headerGroup.headers.map((column: CustomHeaderGroup) => (
                <th
                  {...column.getHeaderProps(
                    column.getSortByToggleProps && column.getSortByToggleProps()
                  )}
                  className={styles.tableCell}
                  key={column.getHeaderProps().key}
                >
                  {column.render("Header")}
                </th>
              ))}
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
