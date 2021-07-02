import { Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { pick } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps, Row } from "react-table";

import { setLastSelectedUpload } from "../../../../state/job/actions";
import { getLastSelectedUpload } from "../../../../state/job/selectors";

const styles = require("./styles.pcss");

interface Props<T extends {}> extends CellProps<T> {
  onSelect?: (rows: Row<T>[], isDeselecting: boolean) => void;
}

/*
    This renders a checkbox that controls the selection state
    of an individual row.
*/
export default function SelectionCell<T extends {}>(props: Props<T>) {
  const dispatch = useDispatch();
  const lastRowSelected = useSelector(getLastSelectedUpload);
  const checkBoxProps = props.row.getToggleRowSelectedProps();

  function onChange(e: CheckboxChangeEvent) {
    // TODO: How to handle expandable rows...?

    // Track the last selected upload row to enable shift selection
    dispatch(setLastSelectedUpload(pick(props.row, ["id", "index"])));
    // If the user holds SHIFT while selecting rows the inbetween rows will be selected
    // unless the last row selected has shifted in position since the interaction
    if (
      e.nativeEvent.shiftKey &&
      lastRowSelected &&
      lastRowSelected.id === props.rows[lastRowSelected.index]?.id
    ) {
      const lowerIndex =
        lastRowSelected.index < props.row.index
          ? lastRowSelected.index
          : props.row.index;
      const higherIndex =
        lastRowSelected.index < props.row.index
          ? props.row.index
          : lastRowSelected.index;
      const rows = props.rows.slice(lowerIndex, higherIndex + 1);
      rows.forEach((row) => {
        props.toggleRowSelected(row.id, e.target.checked);
      });
      props.onSelect?.(rows, !e.target.checked);
    } else {
      checkBoxProps.onChange?.(e as any);
      props.onSelect?.([props.row], !e.target.checked);
    }
  }

  return (
    <div className={styles.checkboxContainer}>
      <Checkbox {...checkBoxProps} onChange={onChange} />
    </div>
  );
}
