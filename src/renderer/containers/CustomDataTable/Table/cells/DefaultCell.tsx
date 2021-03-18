import { Checkbox, Input, Select, Tooltip } from "antd";
import classNames from "classnames";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { WELL_ANNOTATION_NAME } from "../../../../constants";
import { ColumnType } from "../../../../services/labkey-client/types";
import {
  startCellDrag,
  stopCellDrag,
} from "../../../../state/selection/actions";
import { getCellAtDragStart } from "../../../../state/selection/selectors";
import { updateUploadRowValue } from "../../../../state/upload/actions";
import LookupSearch from "../../../LookupSearch";
import { CustomCell } from "../../types";

import WellCell from "./WellCell";

const styles = require("../styles.pcss");

const { Option } = Select;

export default function DefaultCell({
  value: initialValue,
  row: {
    original: { rowId },
  },
  column: { id: columnId, type, isReadOnly, dropdownValues },
}: CustomCell) {
  const dispatch = useDispatch();
  const cellAtDragStart = useSelector(getCellAtDragStart);
  const [value, setValue] = React.useState(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isHighlighted, setIsHighlighted] = React.useState(false);
  const inputEl = React.useRef<HTMLInputElement>(null);

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
            setIsHighlighted(true);
          } else if (isHighlighted) {
            setIsHighlighted(false);
          }
          // If the origin is below this element
        } else if (cellAtDragStart.yCoordinate >= thisCell.bottom) {
          // If the current position is above or within this element
          if (mouseY <= thisCell.bottom) {
            setIsHighlighted(true);
          } else if (isHighlighted) {
            setIsHighlighted(false);
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
  }, [cellAtDragStart, columnId, isHighlighted]);

  if (isReadOnly) {
    return (
      <Tooltip title={`${value}`}>
        <input readOnly className={styles.readOnlyCell} value={value} />
      </Tooltip>
    );
  }

  function onDragStart(e: React.MouseEvent) {
    setIsHighlighted(true);
    dispatch(startCellDrag(e.clientY, columnId));
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") {
      setIsEditing(true);
    }
  }

  if (!isEditing) {
    return (
      <Tooltip title={`${value}`}>
        {/* This input is solely for keyboard navigation */}
        <input className={styles.hidden} onFocus={() => setIsEditing(true)} />
        <div className={styles.readOnlyCellContainer}>
          <input
            readOnly
            ref={inputEl}
            tabIndex={-1}
            className={classNames(
              styles.readOnlyCell,
              isHighlighted ? styles.highlight : undefined
            )}
            onKeyDown={onKeyDown}
            onBlur={() => setIsHighlighted(false)}
            onClick={() =>
              isHighlighted ? setIsEditing(true) : setIsHighlighted(true)
            }
            onDoubleClick={() => setIsEditing(true)}
            value={value}
          />
          <div
            draggable
            className={classNames(
              styles.dragBox,
              isHighlighted ? undefined : styles.invisible
            )}
            onDragStart={onDragStart}
            onDragEnd={(e) => dispatch(stopCellDrag(e.clientY))}
          />
        </div>
      </Tooltip>
    );
  }

  function onBlur() {
    setIsEditing(false);
    setIsHighlighted(false);
    if (value !== initialValue) {
      dispatch(updateUploadRowValue(rowId, columnId, value));
    }
  }

  // Well is our only dynamically rendered custom editor
  if (columnId === WELL_ANNOTATION_NAME) {
    return <WellCell />;
  }

  switch (type) {
    case ColumnType.BOOLEAN:
      return (
        <div onBlur={onBlur} style={{ display: "flex", width: "100%" }}>
          <Checkbox
            autoFocus
            checked={Boolean(value)}
            onChange={() => value && setValue([!value[0]])}
          />
        </div>
      );
    case ColumnType.DATE:
    case ColumnType.DATETIME:
      return <div onBlur={onBlur}>TBD</div>;
    case ColumnType.DURATION:
      return (
        <Input.Group compact onBlur={onBlur}>
          <Input autoFocus value={0} addonAfter="D" />
          <Input value={0} addonAfter="H" />
          <Input value={0} addonAfter="M" />
          <Input value={0} addonAfter="S" />
        </Input.Group>
      );
    case ColumnType.DROPDOWN:
      return (
        <Select
          autoFocus
          allowClear
          defaultOpen
          className={styles.defaultCell}
          mode="multiple"
          onBlur={onBlur}
          onChange={setValue}
          value={value}
        >
          {dropdownValues?.map((dropdownValue: string) => (
            <Option key={dropdownValue}>{dropdownValue}</Option>
          ))}
        </Select>
      );
    case ColumnType.LOOKUP:
      return (
        <LookupSearch
          className={styles.defaultCell}
          onBlur={onBlur}
          defaultOpen={true}
          mode="multiple"
          lookupAnnotationName={columnId}
          selectSearchValue={setValue}
          value={value}
        />
      );
    case ColumnType.NUMBER:
    case ColumnType.TEXT:
      return (
        <Input
          autoFocus
          className={styles.defaultCell}
          onBlur={onBlur}
          onChange={(e) => setValue(e.target.value as any)}
          value={value}
        />
      );
    default:
      // Error-case shouldn't occur
      console.error("Invalid column type", type);
      return null;
  }
}
