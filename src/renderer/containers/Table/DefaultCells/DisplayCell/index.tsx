import { Icon, Tooltip } from "antd";
import classNames from "classnames";
import moment from "moment";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Cell, Column, Row } from "react-table";

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
import { UploadMetadata } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import { getUploadRowKey } from "../../../../state/upload/constants";
import { getFileToAnnotationHasValueMap } from "../../../../state/upload/selectors";

const styles = require("./styles.pcss");

export interface CustomRow extends Row {
  // This contains whatever the row data originally was
  original: any;

  // These props come from using the useExpanded plugin
  canExpand: boolean;
  depth: number;
  isExpanded: boolean;
  getToggleRowExpandedProps: (props: any) => void;

  // This prop comes from useRowSelect plugin
  getToggleRowSelectedProps: () => any;
}

export type CustomColumn = Column<UploadMetadata> & {
  // Custom props supplied in column definition
  description?: string;
  dropdownValues?: string[];
  isReadOnly?: boolean;
  isRequired?: boolean;
  hasSubmitBeenAttempted?: boolean;
  type?: ColumnType;

  // These props come from useSortedBy plugin
  isSorted?: boolean;
  isSortedDesc?: boolean;
  sortType?: string;

  // This prop comes from the useResizeColumns plugin
  disableResizing?: boolean;
};

export type CustomCell = Cell & {
  row: CustomRow;
  column: CustomColumn;

  // This prop comes from useRowSelect plugin
  getToggleAllRowsSelectedProps: () => any;
};

interface Props extends CustomCell {
  onStartEditing: () => void;
  onTabExit?: () => void;
}

export const useDisplayValue = (value?: any[], type?: ColumnType) =>
  React.useMemo(() => {
    if (!value || !value.length) {
      return "";
    }
    switch (type) {
      case ColumnType.BOOLEAN:
        return value[0] ? "Yes" : "No";
      case ColumnType.DATE:
        return value
          .map((d: string) => moment(d).format("M/D/YYYY"))
          .join(", ");
      case ColumnType.DATETIME:
        return value
          .map((d: string) => moment(d).format("M/D/YYYY H:m:s"))
          .join(", ");
      case ColumnType.DURATION:
        return `${value[0].days}D ${value[0].hours}H ${value[0].minutes}M ${value[0].seconds}S`;
      default:
        return value.join(", ");
    }
  }, [value, type]);

/*
  This component is responsible for rendering a non-editable display
  of the data. Notably this component also allows cells be dragged
  across a column to essentially copy its value across the cells dragged
  over.
*/
export default function DisplayCell(props: Props) {
  const dispatch = useDispatch();
  const cellAtDragStart = useSelector(getCellAtDragStart);
  const rowsFromDragEvent = useSelector(getRowsSelectedForDragEvent);
  const fileToAnnotationHasValueMap = useSelector(
    getFileToAnnotationHasValueMap
  );
  const [isActive, setIsActive] = React.useState(false);
  const inputEl = React.useRef<HTMLInputElement>(null);
  const displayValue = useDisplayValue(props.value, props.column.type);
  const {
    column: { id: columnId },
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

  // We want to display a validation error in this cell if there is no value
  // for a row (OR the rows subrows)
  const shouldShowError =
    props.column.hasSubmitBeenAttempted &&
    props.column.isRequired &&
    !fileToAnnotationHasValueMap[
      getUploadRowKey({ file: props.row.original.file })
    ]?.[props.column.id];

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
              dispatch(addRowToDragEvent(rowId));
            }
          } else if (isHighlighted) {
            dispatch(removeRowFromDragEvent(rowId));
          }
          // If the origin is below this element
        } else if (cellAtDragStart.yCoordinate >= thisCell.bottom) {
          // If the current position is above or within this element
          if (mouseY <= thisCell.bottom) {
            if (!isHighlighted) {
              dispatch(addRowToDragEvent(rowId));
            }
          } else if (isHighlighted) {
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
  }, [rowId, columnId, cellAtDragStart, isHighlighted, dispatch]);

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

  function onDisplayInputKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      props.onStartEditing();
    }
  }

  const onHiddenInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      props.onTabExit && props.onTabExit();
    }
  };

  return (
    <Tooltip
      arrowPointAtCenter
      autoAdjustOverflow
      mouseLeaveDelay={0}
      title={displayValue}
    >
      <div className={styles.tooltipAnchor}>
        {/* This input is solely for keyboard navigation */}
        <input
          className={styles.hidden}
          onFocus={props.onStartEditing}
          onKeyDown={props.onTabExit ? onHiddenInputKeyDown : undefined}
        />
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
            onKeyDown={onDisplayInputKeyDown}
            onBlur={() => setIsActive(false)}
            onClick={() =>
              isHighlighted ? props.onStartEditing() : setIsActive(true)
            }
            onDoubleClick={props.onStartEditing}
            value={displayValue}
          />
          {shouldShowError && (
            <Tooltip title={`${props.column.id} is required`}>
              <Icon
                className={styles.errorIcon}
                type="close-circle"
                theme="filled"
              />
            </Tooltip>
          )}
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
      </div>
    </Tooltip>
  );
}
