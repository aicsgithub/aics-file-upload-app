import React from "react";
import { useDispatch } from "react-redux";

import NoteIcon from "../../../../components/NoteIcon";
import { updateUploadRowValue } from "../../../../state/upload/actions";
import { CustomCell } from "../../types";

const styles = require("../styles.pcss");

export default function NotesCell({
  value: initialValue,
  row: {
    original: { rowId },
  },
  column,
}: CustomCell) {
  const dispatch = useDispatch();
  const [isHighlighted, setIsHighlighted] = React.useState(false);

  function saveNotes(value?: string) {
    if (value !== initialValue) {
      dispatch(updateUploadRowValue(rowId, column.id, value));
    }
  }

  return (
    <div className={isHighlighted && styles.highlighted}>
      <NoteIcon
        editable={true}
        handleError={() => console.log("error notes")}
        notes={initialValue}
        saveNotes={saveNotes}
      />
      <input
        className={styles.hidden}
        tabIndex={-1}
        onBlur={() => setIsHighlighted(false)}
        onFocus={() => setIsHighlighted(true)}
      />
    </div>
  );
}
