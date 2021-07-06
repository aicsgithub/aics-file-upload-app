import { isEqual } from "lodash";
import * as React from "react";
import { Row } from "react-table";
import { ListChildComponentProps } from "react-window";

const styles = require("./styles.pcss");

interface Props<T extends {}> extends Row<T> {
  rowStyle: any;
}

/**
 * Row in a react-table. This component is memoized below to only re-render when
 * the rows data is changed, has been expanded, or has new columns. Abstracting this
 * out into a memoized component allows the app to keep up with rapid updates from
 * sources like the copy progress updater.
 */
function TableRow<T extends {}>(props: Props<T>) {
  console.log(props.id, props.original);
  return (
    <div
      {...props.getRowProps({ style: props.rowStyle })}
      key={props.getRowProps().key}
    >
      {props.cells.map((cell) => (
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
}

// Memoize the component
const TableRowMemoized = React.memo(
  TableRow,
  (prevProp, nextProp) =>
    isEqual(prevProp.original, nextProp.original) &&
    prevProp.isSelected === nextProp.isSelected &&
    prevProp.isExpanded === nextProp.isExpanded &&
    // Updates row after columns change
    prevProp.cells.length === nextProp.cells.length &&
    // Updates row after resizing
    nextProp.cells.every((cell) => !cell.column.isResizing)
) as typeof TableRow;

/**
 * This renderer wrapper accepts props from react-window. This in combination with
 * the itemData prop given to react-window allows the app to determine which data to render
 * for which row. Moving this logic to be in-line or dependent on equality between the
 * rows prop forces complete unmounting/re-mounting of the rows on any update.
 */
export default function TableRowRenderer({
  index,
  style,
  data,
}: ListChildComponentProps) {
  const { rows, prepareRow } = data;
  const row = rows[index];
  prepareRow(row);
  return <TableRowMemoized {...row} rowStyle={style} />;
}
