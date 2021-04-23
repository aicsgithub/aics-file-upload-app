import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { CellProps } from "react-table";

import { ColumnType } from "../../../services/labkey-client/types";
import { updateUpload } from "../../../state/upload/actions";
import { UploadJobTableRow } from "../../../state/upload/types";
import { Duration } from "../../../types";
import BooleanCell from "../CustomCells/BooleanCell";
import DateCell from "../CustomCells/DateCell";
import DropdownCell from "../CustomCells/DropdownCell";
import DurationCell from "../CustomCells/DurationCell";
import LookupCell from "../CustomCells/LookupCell";
import TextCell from "../CustomCells/TextCell";
import { ColumnValue } from "../types";

import DisplayCell from "./DisplayCell";

/*
  This component is responsible by default for react-tables for
  displaying the value supplied as well as creating an interactive
  editor based on the column's annotation type
*/
export default function DefaultCell(
  props: CellProps<UploadJobTableRow, ColumnValue>
) {
  const { column, value } = props;
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);

  function commitChanges(value: ColumnValue) {
    setIsEditing(false);
    dispatch(updateUpload(props.row.id, { [props.column.id]: value }));
  }

  if (isEditing) {
    switch (column.type) {
      case ColumnType.BOOLEAN:
        return (
          <BooleanCell
            initialValue={value as boolean[]}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.TEXT:
      case ColumnType.NUMBER:
        return (
          <TextCell
            initialValue={value as string[]}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.DURATION:
        return (
          <DurationCell
            initialValue={value as Duration[]}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.DROPDOWN:
        return (
          <DropdownCell
            initialValue={value as string[]}
            options={column?.dropdownValues ?? []}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.LOOKUP:
        return (
          <LookupCell
            initialValue={value as string[]}
            lookupAnnotationName={column.id}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.DATE:
      case ColumnType.DATETIME:
        return (
          <DateCell
            initialValue={value as Date[]}
            column={column}
            commitChanges={commitChanges}
          />
        );
      default:
        // Error-case shouldn't occur
        console.error("Invalid column type", props.column.type);
        return null;
    }
  }

  return <DisplayCell {...props} onStartEditing={() => setIsEditing(true)} />;
}
