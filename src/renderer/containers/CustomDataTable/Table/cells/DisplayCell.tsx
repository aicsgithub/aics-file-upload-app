import { Tooltip } from "antd";
import classNames from "classnames";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ColumnType } from "../../../../services/labkey-client/types";
import {
  addRowToDragEvent,
  removeRowFromDragEvent,
  startCellDrag,
  stopCellDrag,
} from "../../../../state/selection/actions";
import {
  getCellAtDragStart,
  getRowsSelectedForDragEvent,
} from "../../../../state/selection/selectors";
import { updateUpload } from "../../../../state/upload/actions";
import { CustomCell } from "../../types";

const styles = require("../styles.pcss");

interface Props extends CustomCell {
  onStartEditing: () => void;
}

/*
    TODO: docstring
*/
export default function DisplayCell(props: Props) {
  const dispatch = useDispatch();
  const cellAtDragStart = useSelector(getCellAtDragStart);
  const rowsFromDragEvent = useSelector(getRowsSelectedForDragEvent);
  const [isActive, setIsActive] = React.useState(false);
  const inputEl = React.useRef<HTMLInputElement>(null);
  const {
    column: { id: columnId, type },
    row: { id: rowId },
    value,
  } = props;

  let isHighlighted = isActive;
  if (!isHighlighted && cellAtDragStart?.columnId === columnId) {
    isHighlighted = [
      cellAtDragStart.rowId,
      ...(rowsFromDragEvent || []),
    ].includes(rowId);
  }

  // When a cell is being dragged add an event listener for cells
  // in the same column to check if this cell needs to be highlighted
  React.useEffect(() => {
    function onDragOver(e: Event) {
      if (cellAtDragStart && inputEl.current) {
        const { clientY: mouseY } = (e as any) as React.MouseEvent;
        const thisCell = inputEl.current.getBoundingClientRect();
        // If the origin is above this element
        if (cellAtDragStart.yCoordinate <= thisCell.top) {
          // If the current position is below or within this element
          if (mouseY >= thisCell.top) {
            if (!isHighlighted) {
              console.log("addRowToDragEvent", rowId);
              dispatch(addRowToDragEvent(rowId));
            }
          } else if (isHighlighted) {
            console.log("removeRowFromDragEvent", rowId);
            dispatch(removeRowFromDragEvent(rowId));
          }
          // If the origin is below this element
        } else if (cellAtDragStart.yCoordinate >= thisCell.bottom) {
          // If the current position is above or within this element
          if (mouseY <= thisCell.bottom) {
            if (!isHighlighted) {
              console.log("addRowToDragEvent", rowId);
              dispatch(addRowToDragEvent(rowId));
            }
          } else if (isHighlighted) {
            console.log("removeRowFromDragEvent", rowId);
            dispatch(removeRowFromDragEvent(rowId));
          }
        }
      }
    }
    // Add event listener to cell drag if the cell is in the same column
    if (cellAtDragStart && cellAtDragStart.columnId === columnId) {
      document.addEventListener("dragover", onDragOver);
    } else {
      document.removeEventListener("dragover", onDragOver);
    }
    return () => document.removeEventListener("dragover", onDragOver);
  }, [cellAtDragStart, columnId, rowId, isHighlighted, dispatch]);

  const displayValue = React.useMemo(() => {
    if (!value.length) {
      return "";
    }
    switch (type) {
      case ColumnType.BOOLEAN:
        return value[0] ? "Yes" : "No";
      case ColumnType.DURATION:
        return `${value[0].days}D ${value[0].hours}H ${value[0].minutes}M ${value[0].seconds}S`;
      default:
        return value.join(", ");
    }
  }, [value, type]);

  function onCopy() {
    const copyData = JSON.stringify({
      value,
      columnId: props.column.id,
    });
    navigator.clipboard.writeText(copyData);
  }

  async function onPaste() {
    const clipboardText = await navigator.clipboard.readText();
    try {
      const copiedData = JSON.parse(clipboardText);
      if (copiedData.columnId === props.column.id) {
        dispatch(
          updateUpload(props.row.id, { [props.column.id]: copiedData.value })
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  function onDragStart(e: React.MouseEvent) {
    dispatch(startCellDrag(e.clientY, rowId, columnId));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      props.onStartEditing();
    }
  }

  return (
    <Tooltip title={displayValue}>
      {/* This input is solely for keyboard navigation */}
      <input className={styles.hidden} onFocus={props.onStartEditing} />
      <div
        className={styles.readOnlyCellContainer}
        onCopy={onCopy}
        onPaste={onPaste}
      >
        <input
          readOnly
          ref={inputEl}
          tabIndex={-1}
          className={classNames(
            styles.readOnlyCell,
            isHighlighted ? styles.highlight : undefined
          )}
          onKeyDown={onKeyDown}
          onBlur={() => setIsActive(false)}
          onClick={() =>
            isHighlighted ? props.onStartEditing() : setIsActive(true)
          }
          onDoubleClick={props.onStartEditing}
          value={displayValue}
        />
        <div
          draggable
          className={classNames(
            styles.dragBox,
            isHighlighted ? undefined : styles.invisible
          )}
          onDragStart={onDragStart}
          onDragEnd={() => dispatch(stopCellDrag())}
        />
      </div>
    </Tooltip>
  );
}
