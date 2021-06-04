import { Icon, Input, Modal, Tooltip } from "antd";
import { OpenDialogOptions, remote } from "electron";
import { castArray } from "lodash";
import React from "react";
import { useDispatch } from "react-redux";
import { CellProps } from "react-table";
import { Dispatch } from "redux";

import DragAndDrop from "../../../../components/DragAndDrop";
import { setAlert } from "../../../../state/feedback/actions";
import { AlertType, DragAndDropFileList } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import { UploadTableRow } from "../../../../state/upload/types";
import { onDrop, onOpen } from "../../../../util";

const styles = require("./styles.pcss");

const { TextArea } = Input;

type Props = CellProps<UploadTableRow, string>;

// Only want user to be able to select 1 file & it must be of type .txt
const openDialogOptions: OpenDialogOptions = {
  filters: [{ name: "Text", extensions: ["txt"] }],
  properties: ["openFile"],
  title: "Open Text file",
};

function getContextMenuItems(dispatch: Dispatch, props: Props, notes: string) {
  return remote.Menu.buildFromTemplate([
    {
      click: () => {
        navigator.clipboard.writeText(notes);
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
        navigator.clipboard.writeText(notes);
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
function NotesCell(props: Props) {
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(
    !props.value || !props.value.length
  );
  const [notes, setNotes] = React.useState<string[]>(
    props.value ? castArray(props.value) : []
  );
  const note = notes.length ? notes[0] : undefined;

  async function onFileDrop(files: DragAndDropFileList) {
    const droppedNotes = await onDrop(files, (error) =>
      dispatch(
        setAlert({
          message: error,
          type: AlertType.WARN,
        })
      )
    );
    setNotes([droppedNotes]);
  }

  async function onFileOpen(files: string[]) {
    const openedNotes = await onOpen(files, (error) =>
      dispatch(
        setAlert({
          message: error,
          type: AlertType.WARN,
        })
      )
    );
    setNotes([openedNotes]);
  }

  function onOk() {
    setIsEditing(false);
    setIsModalOpen(false);
    const trimmedNotes = note?.trim();
    dispatch(
      updateUpload(props.row.id, {
        [props.column.id]: trimmedNotes ? [trimmedNotes] : undefined,
      })
    );
  }

  function onCancel() {
    setIsEditing(false);
    setIsModalOpen(false);
    setNotes(props.value ? castArray(props.value) : []);
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    getContextMenuItems(dispatch, props, note || "").popup();
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
              onChange={(e) => setNotes([e.target.value])}
              placeholder="Type notes for file here or drag/drop a file below"
              autoSize={{ minRows: 4, maxRows: 12 }}
              value={note}
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
            {note?.split("\n").map((line, i) => (
              // Using an index as a key is not recommended, but it is safe in
              // this case
              <p key={i}>{line}</p>
            ))}
          </>
        )}
      </Modal>
      <Tooltip title={note ? `${note?.substring(0, 50)}...` : ""}>
        <div className={styles.alignCenter} onContextMenu={onContextMenu}>
          {(!props.column.isReadOnly || notes) && (
            <Icon
              onClick={() => setIsModalOpen(true)}
              type={note ? "file-text" : "plus-circle"}
            />
          )}
        </div>
      </Tooltip>
    </>
  );
}

export default function NotesCellWrapper(props: Props) {
  return <NotesCell {...props} key={props.value} />;
}
