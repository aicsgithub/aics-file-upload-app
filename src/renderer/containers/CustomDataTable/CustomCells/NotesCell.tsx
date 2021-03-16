import React from "react";

import NoteIcon from "../../../components/NoteIcon";
import { CustomCell } from "../Cell";

export default function NotesCell({
  value: initialValue,
  row: {
    original: { rowId },
  },
  column,
  onCellUpdate, // This is a custom function that we supplied to our table instance
}: CustomCell) {
  return (
    <NoteIcon
      editable={true}
      handleError={() => console.log("error notes")}
      notes={initialValue}
      saveNotes={(v) => onCellUpdate(rowId, column.id, v)}
    />
  );
}
