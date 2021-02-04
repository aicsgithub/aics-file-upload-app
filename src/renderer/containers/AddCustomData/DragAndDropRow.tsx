import { Button } from "antd";
import { OpenDialogOptions, remote } from "electron";
import { isEmpty } from "lodash";
import React from "react";

import { LoadFilesFromOpenDialogAction } from "../../state/selection/types";

const styles = require("./style.pcss");

interface Props {
  onBrowse: (files: string[]) => LoadFilesFromOpenDialogAction;
}

// On Windows, file browsers cannot look for directories and files at the same time
// directories are the default in that case
const openDialogOptions: OpenDialogOptions = {
  properties: ["openFile", "openDirectory", "multiSelections"],
  title: "Browse for folders, or drag and drop files/folders onto app",
};

export default function DragAndDropRow({ onBrowse }: Props) {
  async function openFileBrowser() {
    const { filePaths: filenames } = await remote.dialog.showOpenDialog(
      openDialogOptions
    );
    // If cancel is clicked, this callback gets called and filenames is undefined
    if (!isEmpty(filenames)) {
      onBrowse(filenames);
    }
  }

  return (
    <div className={styles.dragAndDropRow}>
      Drag and Drop -or-
      <Button onClick={openFileBrowser} size="small">
        browse
      </Button>
      for additional files
    </div>
  );
}
