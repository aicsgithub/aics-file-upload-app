import React from "react";
import { useDispatch } from "react-redux";

import NoteIcon from "../../../../components/NoteIcon";
import { updateUploadRowValue } from "../../../../state/upload/actions";
import { CustomCell } from "../../types";

export default function NotesCell({
  value: initialValue,
  row: {
    original: { rowId },
  },
  column,
}: CustomCell) {
  const dispatch = useDispatch();
  function saveNotes(value?: string) {
    if (value !== initialValue) {
      dispatch(updateUploadRowValue(rowId, column.id, value));
    }
  }
  return (
    <NoteIcon
      editable={true}
      handleError={() => console.log("error notes")}
      notes={initialValue}
      saveNotes={saveNotes}
    />
  );
}
