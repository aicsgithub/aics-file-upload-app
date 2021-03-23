import { Button } from "antd";
import { OpenDialogOptions, remote } from "electron";
import { isEmpty } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { openFilesFromDialog } from "../../state/selection/actions";
import { getIsSelectedJobInFlight } from "../../state/selection/selectors";

const styles = require("./styles.pcss");

// On Windows, file browsers cannot look for directories and files at the same time
// directories are the default in that case
const openDialogOptions: OpenDialogOptions = {
  properties: ["openFile", "openDirectory", "multiSelections"],
  title: "Browse for folders, or drag and drop files/folders onto app",
};

export default function TableFooter() {
  const dispatch = useDispatch();
  const isReadOnly = useSelector(getIsSelectedJobInFlight);

  if (isReadOnly) {
    return null;
  }

  async function openFileBrowser() {
    const { filePaths: filenames } = await remote.dialog.showOpenDialog(
      openDialogOptions
    );
    // If cancel is clicked, this callback gets called and filenames is undefined
    if (!isEmpty(filenames)) {
      dispatch(openFilesFromDialog(filenames));
    }
  }

  return (
    <div className={styles.tableFooter}>
      Drag and Drop -or-
      <Button onClick={openFileBrowser} size="small">
        browse
      </Button>
      for additional files
    </div>
  );
}
