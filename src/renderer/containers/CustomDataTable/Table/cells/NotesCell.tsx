import React from "react";
import { useDispatch } from "react-redux";

import NoteIcon from "../../../../components/NoteIcon";
import { updateUpload } from "../../../../state/upload/actions";
import { CustomCell } from "../../types";

export default function NotesCell({
  value: initialValue,
  row,
  column,
}: CustomCell) {
  const dispatch = useDispatch();

  function saveNotes(value?: string) {
    if (value !== initialValue) {
      dispatch(updateUpload(row.id, { [column.id]: value }));
    }
  }

  return (
    // TODO: Refactor NoteIcon to be the NotesCell
    <NoteIcon
      editable={true}
      handleError={() => console.log("error notes")}
      notes={initialValue}
      saveNotes={saveNotes}
    />
  );
}
