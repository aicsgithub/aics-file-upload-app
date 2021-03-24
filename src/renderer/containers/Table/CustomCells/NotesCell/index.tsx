import { Icon, Modal } from "antd";
import TextArea from "antd/es/input/TextArea";
import { OpenDialogOptions, remote } from "electron";
import React from "react";
import { useDispatch } from "react-redux";
import { Dispatch } from "redux";

import DragAndDrop from "../../../../components/DragAndDrop";
import { setAlert } from "../../../../state/feedback/actions";
import { AlertType, DragAndDropFileList } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import { onDrop, onOpen } from "../../../../util";
import { CustomCell } from "../../DefaultCells/DisplayCell";

const styles = require("./styles.pcss");

// Only want user to be able to select 1 file & it must be of type .txt
const openDialogOptions: OpenDialogOptions = {
  filters: [{ name: "Text", extensions: ["txt"] }],
  properties: ["openFile"],
  title: "Open Text file",
};

function getContextMenuItems(
  dispatch: Dispatch,
  props: CustomCell,
  notes?: string
) {
  return remote.Menu.buildFromTemplate([
    {
      click: () => {
        navigator.clipboard.writeText(notes || "");
        dispatch(
          updateUpload(props.row.id, {
            [props.column.id]: undefined,
          })
        );
      },
      enabled: !!notes,
      label: "Cut",
    },
    {
      click: () => {
        navigator.clipboard.writeText(notes || "");
      },
      enabled: !!notes,
      label: "Copy",
    },
    {
      click: async () => {
        const pastedText = await navigator.clipboard.readText();
        const trimmedText = pastedText.trim();
        dispatch(
          updateUpload(props.row.id, {
            [props.column.id]: trimmedText ? [trimmedText] : undefined,
          })
        );
      },
      label: "Paste",
    },
    {
      click: () => {
        dispatch(
          updateUpload(props.row.id, {
            [props.column.id]: undefined,
          })
        );
      },
      enabled: !!notes,
      label: "Delete",
    },
  ]);
}

/**
  This component is for rendering notes related to files and managing different 
  modes of editing them. It also contains static methods for reading
  .txt files from drag or drop events.
 */
function NotesCell(props: CustomCell) {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = React.useState(!props.value);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [notes, setNotes] = React.useState<string | undefined>(props.value);
  console.log(props.value, notes, isEditing, isModalOpen);

  async function onFileDrop(files: DragAndDropFileList) {
    const notes = await onDrop(files, (error) =>
      dispatch(
        setAlert({
          message: error,
          type: AlertType.WARN,
        })
      )
    );
    setNotes(notes);
  }

  async function onFileOpen(files: string[]) {
    const notes = await onOpen(files, (error) =>
      dispatch(
        setAlert({
          message: error,
          type: AlertType.WARN,
        })
      )
    );
    setNotes(notes);
  }

  function onOk() {
    setIsEditing(false);
    setIsModalOpen(false);
    const trimmedNotes = notes?.trim();
    dispatch(
      updateUpload(props.row.id, {
        [props.column.id]: trimmedNotes ? [trimmedNotes] : undefined,
      })
    );
  }

  function onCancel() {
    setIsEditing(false);
    setIsModalOpen(false);
    setNotes(props.value);
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    getContextMenuItems(dispatch, props, notes).popup();
  };

  return (
    <>
      <Modal
        width="90%"
        title={props.column.isReadOnly ? "View Notes" : "Add Notes"}
        visible={isModalOpen}
        onOk={onOk}
        onCancel={onCancel}
        okText={props.column.isReadOnly ? "Done" : "Save"}
      >
        {isEditing ? (
          <DragAndDrop
            onDrop={onFileDrop}
            onOpen={onFileOpen}
            openDialogOptions={openDialogOptions}
          >
            <TextArea
              className={styles.useFullWidth}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type notes for file here or drag/drop a file below"
              autoSize={{ minRows: 4, maxRows: 12 }}
              value={notes}
            />
            <p className={styles.dragAndDropNote}>
              <strong>Note:</strong> Notes must be file type .txt
            </p>
            <DragAndDrop
              onDrop={onFileDrop}
              onOpen={onFileOpen}
              openDialogOptions={openDialogOptions}
            />
          </DragAndDrop>
        ) : (
          <>
            {!props.column.isReadOnly && (
              <Icon
                onClick={() => setIsEditing(true)}
                style={{ float: "right" }}
                type="form"
              />
            )}
            {/* New line formatting might be important for viewing, so preserve it in view */}
            {notes?.split("\n").map((line, i) => (
              // Using an index as a key is not recommended, but it is safe in
              // this case
              <p key={i}>{line}</p>
            ))}
          </>
        )}
      </Modal>
      <div className={styles.alignCenter} onContextMenu={onContextMenu}>
        <Icon
          onClick={() => setIsModalOpen(true)}
          type={notes ? "file-text" : "plus-circle"}
        />
      </div>
    </>
  );
}

export default function NotesCellWrapper(props: CustomCell) {
  return <NotesCell {...props} key={props.value} />;
}
