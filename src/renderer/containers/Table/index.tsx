import classNames from "classnames";
import React from "react";
import { HeaderGroup, TableInstance } from "react-table";
import { FixedSizeList } from "react-window";

const styles = require("./styles.pcss");

interface Props<T extends {}> {
  className?: string;
  height?: number;
  tableInstance: TableInstance<T>;
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
  const { className, tableInstance } = props;

  const scrollBarSize = React.useMemo(() => getScrollBarWidth(), []);

  const { rows, prepareRow } = tableInstance;
  const RenderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);
      return (
        <div {...row.getRowProps({ style })} key={row.getRowProps().key}>
          {row.cells.map((cell) => (
            <div
              {...cell.getCellProps()}
              className={styles.tableCell}
              key={cell.getCellProps().key}
            >
              {cell.render("Cell")}
            </div>
          ))}
        </div>
      );
    },
    [prepareRow, rows]
  );

  return (
    <div className={classNames(styles.tableContainer, className)}>
      <div className={styles.tableContainer} {...tableInstance.getTableProps()}>
        <div>
          {tableInstance.headerGroups.map((headerGroup) => (
            <div
              {...headerGroup.getHeaderGroupProps()}
              key={headerGroup.getHeaderGroupProps().key}
            >
              {headerGroup.headers.map((column: HeaderGroup<T>) => (
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
                    <div>
                      {column.canFilter ? column.render("Filter") : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div {...tableInstance.getTableBodyProps()}>
          <FixedSizeList
            height={props.height || 400}
            itemCount={tableInstance.rows.length}
            itemSize={35}
            width={tableInstance.totalColumnsWidth + scrollBarSize}
          >
            {RenderRow}
          </FixedSizeList>
        </div>
        {!!tableInstance.filteredRows &&
          tableInstance.filteredRows.length !== tableInstance.rows.length && (
            <div>
              <div>
                <div>
                  Showing {tableInstance.filteredRows.length} of{" "}
                  {tableInstance.rows.length}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
