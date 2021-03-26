import { Icon, Tooltip } from "antd";
import classNames from "classnames";
import moment from "moment";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Cell, Column, Row } from "react-table";

import { ColumnType } from "../../../../services/labkey-client/types";
import {
  addRowToDragEvent,
  removeRowsFromDragEvent,
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
import { Duration } from "../../../../types";

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
      case ColumnType.DURATION: {
        const { days, hours, minutes, seconds } = value[0] as Duration;
        return (
          (days ? `${days}D ` : "") +
          (hours ? `${hours}H ` : "") +
          (minutes ? `${minutes}M ` : "") +
          (seconds ? `${seconds}S ` : "")
        ).trim();
      }
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
    row: { id: rowId, index: rowIndex },
    value,
  } = props;

  let isHighlighted = isActive;
  if (!isHighlighted && cellAtDragStart?.columnId === columnId) {
    isHighlighted = !![
      { index: cellAtDragStart.rowIndex },
      ...(rowsFromDragEvent || []),
    ].find((row) => row.index === rowIndex);
  }

  // We want to display a validation error in this cell if there is no value
  // for a row (OR the rows subrows)
  const shouldShowError =
    props.column.hasSubmitBeenAttempted &&
    props.column.isRequired &&
    !fileToAnnotationHasValueMap[
      getUploadRowKey({ file: props.row.original.file })
    ]?.[props.column.id];

  // Track if any rows have been skipped by the drag
  // possible if the user exited our elements with onDragEnter
  // events and then returned to a latter one
  React.useEffect(() => {
    if (
      rowsFromDragEvent?.length &&
      cellAtDragStart?.columnId === columnId &&
      !rowsFromDragEvent.find((row) => row.index === rowIndex)
    ) {
      let min = rowIndex;
      let max = rowIndex;
      rowsFromDragEvent.forEach((row) => {
        min = Math.min(min, row.index);
        max = Math.max(max, row.index);
      });
      if (min < rowIndex && max > rowIndex) {
        dispatch(addRowToDragEvent(rowId, rowIndex));
      }
    }
  }, [dispatch, rowId, rowIndex, columnId, cellAtDragStart, rowsFromDragEvent]);

  function onDragStart() {
    dispatch(startCellDrag(rowId, rowIndex, columnId));
  }

  function onDragEnter() {
    if (cellAtDragStart) {
      // On drag entry if this cell hasn't been highlighted
      // we know we need to add it to our list of rows dragged over
      if (
        !rowsFromDragEvent ||
        !rowsFromDragEvent.find((row) => row.index === rowIndex)
      ) {
        dispatch(addRowToDragEvent(rowId, rowIndex));
      } else if (rowsFromDragEvent) {
        // If this cell has already been highlighted before we
        // must be backtracking across rows we've dragged over
        // before and need to clean up any now irrelevant ones
        if (cellAtDragStart.rowIndex > rowIndex) {
          const lowerIndexRows = rowsFromDragEvent
            .filter(
              (row) =>
                row.index < rowIndex || row.index > cellAtDragStart.rowIndex
            )
            .map((row) => row.id);
          if (lowerIndexRows.length) {
            dispatch(removeRowsFromDragEvent(lowerIndexRows));
          }
        } else {
          const higherIndexRows = rowsFromDragEvent
            .filter(
              (row) =>
                row.index > rowIndex || row.index < cellAtDragStart.rowIndex
            )
            .map((row) => row.id);
          if (higherIndexRows.length) {
            dispatch(removeRowsFromDragEvent(higherIndexRows));
          }
        }
      }
    }
  }

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
      <div className={styles.tooltipAnchor} onDragEnter={onDragEnter}>
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
            className={classNames(styles.readOnlyCell, {
              [styles.highlight]: isHighlighted,
            })}
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
            className={classNames(styles.dragBox, {
              [styles.invisible]: !isHighlighted,
            })}
            onDragStart={onDragStart}
            onDragEnd={() => dispatch(stopCellDrag())}
          />
        </div>
      </div>
    </Tooltip>
  );
}
