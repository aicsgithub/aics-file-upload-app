import classNames from "classnames";
import * as React from "react";
import { Row, TableInstance } from "react-table";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

import TableRow from "./TableRow";

const styles = require("./styles.pcss");

interface Props<T extends {}> {
  className?: string;
  tableInstance: TableInstance<T>;
  onContextMenu?: (row: Row<T>, onCloseCallback: () => void) => void;
}

// From https://davidwalsh.name/detect-scrollbar-width
function getScrollBarWidth(): number {
  const scrollDiv = document.createElement("div");
  scrollDiv.setAttribute(
    "style",
    "width: 100px; height: 100px; overflow: scroll; position:absolute; top:-9999px;"
  );
  document.body.appendChild(scrollDiv);
  const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  document.body.removeChild(scrollDiv);
  return scrollbarWidth;
}

/*
  This stateless component renders a table meant for connecting to
  and utilizing a react-table instance through interactive hooks.
  The "Header" & "Cell" rendered are determined by the Header & Cell
  properties of the column definition supplied for that column or
  by the defaultColumn properties supplied to react-table.
*/
export default function Table<T extends {}>(props: Props<T>) {
  const { className, tableInstance, onContextMenu } = props;

  const scrollBarSize = React.useMemo(() => getScrollBarWidth(), []);

  const { rows, prepareRow } = tableInstance;

  return (
    <div
      className={classNames(styles.tableContainer, className)}
      {...tableInstance.getTableProps()}
    >
      <div>
        {tableInstance.headerGroups.map((headerGroup) => (
          <div
            {...headerGroup.getHeaderGroupProps()}
            key={headerGroup.getHeaderGroupProps().key}
          >
            {headerGroup.headers.map((column) => (
              <div
                {...column.getHeaderProps()}
                className={styles.tableHeader}
                key={column.getHeaderProps().key}
              >
                <div className={styles.tableHeaderContainer}>
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
                  {column.canFilter && <div>{column.render("Filter")}</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.tableBody} {...tableInstance.getTableBodyProps()}>
        <AutoSizer disableWidth>
          {({ height }) => (
            <FixedSizeList
              height={height}
              itemData={{ rows, prepareRow, onContextMenu }}
              itemCount={tableInstance.rows.length}
              itemSize={35}
              width={tableInstance.totalColumnsWidth + scrollBarSize}
            >
              {TableRow}
            </FixedSizeList>
          )}
        </AutoSizer>
      </div>
      {!!tableInstance.filteredRows &&
        tableInstance.filteredRows.length !==
          tableInstance.preFilteredRows.length && (
          <div className={styles.tableFooter}>
            Showing {tableInstance.filteredRows.length} of{" "}
            {tableInstance.preFilteredRows.length}
          </div>
        )}
    </div>
  );
}
