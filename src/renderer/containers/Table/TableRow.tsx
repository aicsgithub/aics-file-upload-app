import { isEqual } from "lodash";
import * as React from "react";
import { useDrag, useDrop } from 'react-dnd';
// import HTML5Backend from 'react-dnd-html5-backend';
import { Row } from "react-table";
import { ListChildComponentProps } from "react-window";

const styles = require("./styles.pcss");

const DND_ITEM_TYPE = 'row'

interface Props<T extends {}> extends Row<T> {
  onContextMenu?: (row: Row<T>, onCloseCallback: () => void) => void;
  onRowDrag?: (dragIndex: number, hoverIndex: number) => void;
  rowStyle: any;
}

/**
 * Row in a react-table. This component is memoized below to only re-render when
 * the rows data is changed, has been expanded, or has new columns. Abstracting this
 * out into a memoized component allows the app to keep up with rapid updates from
 * sources like the copy progress updater.
 */
function TableRow<T extends {}>(props: Props<T>) {
  const dragAndDropRef = React.useRef(null);
  const [isHighlighted, setIsHighlighted] = React.useState(false);

  function onContextMenu() {
    if (props.onContextMenu) {
      setIsHighlighted(true);
      props.onContextMenu(props, () => setIsHighlighted(false));
    }
  }

  // No need to set up row drag and dropping on rows without the necessary callback
  if (props.onRowDrag) {
    const [, drop] = useDrop({
      accept: DND_ITEM_TYPE,
      hover(item: any, monitor) {
        if (!dragAndDropRef.current) {
          return
        }
        const dragIndex = item.index
        const hoverIndex = props.index
        // Don't replace items with themselves
        if (dragIndex === hoverIndex) {
          return
        }
        // Determine rectangle on screen
        const hoverBoundingRect = dragAndDropRef.current?.getBoundingClientRect();
        // Get vertical middle
        const hoverMiddleY =
          (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
        // Determine mouse position
        const clientOffset = monitor.getClientOffset()
        // Get pixels to the top
        const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top
        // Only perform the move when the mouse has crossed half of the items height
        // When dragging downwards, only move when the cursor is below 50%
        // When dragging upwards, only move when the cursor is above 50%
        // Dragging downwards
        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
          return
        }
        // Dragging upwards
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
          return
        }
        // Time to actually perform the action
        props.onRowDrag?.(dragIndex, hoverIndex)
        // Note: we're mutating the monitor item here!
        // Generally it's better to avoid mutations,
        // but it's good here for the sake of performance
        // to avoid expensive index searches.
        item.index = hoverIndex
      },
    })

    const [{ isDragging }, drag, preview] = useDrag({
      item: { type: DND_ITEM_TYPE, index: props.index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      type: DND_ITEM_TYPE
    })

    const opacity = isDragging ? 0 : 1

    preview(drop(dragAndDropRef))
    drag(dragAndDropRef)
  }

  return (
    <div
      {...props.getRowProps({ style: props.rowStyle })}
      className={isHighlighted ? styles.highlighted : undefined}
      key={props.getRowProps().key}
      onContextMenu={onContextMenu}
      ref={dragAndDropRef}
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
    nextProp.cells.every(
      (cell, index) =>
        !cell.column.isResizing &&
        isEqual(cell.column, prevProp.cells[index].column)
    )
) as typeof TableRow;

interface ItemData<T extends {}> {
  rows: Row<T>[];
  prepareRow: (row: Row<T>) => void;
  onContextMenu?: (row: Row<T>, onCloseCallback: () => void) => void;
  onRowDrag?: (dragIndex: number, hoverIndex: number) => void;
}

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
}: ListChildComponentProps<ItemData<any>>) {
  const { rows, prepareRow } = data;
  const row = rows[index];
  prepareRow(row);
  return (
    <TableRowMemoized {...row} rowStyle={style} onContextMenu={data.onContextMenu} onRowDrag={data.onRowDrag} />
  );
}
