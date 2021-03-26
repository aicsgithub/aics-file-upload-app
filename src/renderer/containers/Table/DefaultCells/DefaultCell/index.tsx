import { isNil } from "lodash";
import React from "react";
import { useDispatch } from "react-redux";

import { updateUpload } from "../../../../state/upload/actions";
import DisplayCell, { CustomCell } from "../DisplayCell";

import DefaultEditor from "./DefaultEditor";

const styles = require("./styles.pcss");

/*
  This component is responsible by default for react-tables for
  displaying the value supplied as well as creating an interactive
  editor based on the column's annotation type
*/
export default function DefaultCell(props: CustomCell) {
  const dispatch = useDispatch();
  const initialValue = props.value;
  const [value, setValue] = React.useState(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);

  // MassEditing or pasting will result in an external update
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // During load state transitions the value isn't guaranteed to be anything
  if (!initialValue) {
    return null;
  }

  if (!isEditing) {
    return <DisplayCell {...props} onStartEditing={() => setIsEditing(true)} />;
  }

  function onStopEditing() {
    setIsEditing(false);
    if (value !== props.value) {
      dispatch(
        updateUpload(props.row.id, {
          [props.column.id]: value.filter((v: any[]) => !isNil(v)),
        })
      );
    }
  }

  function onKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      onStopEditing();
    }
  }

  return (
    <div className={styles.editorContainer} onKeyPress={onKeyPress}>
      <DefaultEditor
        column={props.column}
        value={value}
        initialValue={initialValue}
        setValue={setValue}
        onStopEditing={onStopEditing}
      />
    </div>
  );
}
