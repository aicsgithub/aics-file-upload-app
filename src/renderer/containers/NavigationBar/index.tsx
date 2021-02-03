import { ipcRenderer } from "electron";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { OPEN_SETTINGS_EDITOR } from "../../../shared/constants";
import { selectPage, selectView } from "../../state/route/actions";
import { getView } from "../../state/route/selectors";
import { Page } from "../../state/types";
import { getUpload } from "../../state/upload/selectors";
import NotificationViewer from "../NotificationViewer";
import SettingsModal from "../SettingsModal";

import NavigationButton from "./NavigationButton";

const styles = require("./styles.pcss");

export default function NavigationBar() {
  const dispatch = useDispatch();
  const view = useSelector(getView);
  const uploads = useSelector(getUpload);
  const isUploadJobInProgress = Boolean(Object.keys(uploads).length);

  // Catch signals to open the settings modal from the file menu bar
  React.useEffect(() => {
    ipcRenderer.on(OPEN_SETTINGS_EDITOR, () =>
      dispatch(selectView(Page.Settings))
    );

    return function cleanUp() {
      ipcRenderer.removeAllListeners(OPEN_SETTINGS_EDITOR);
    };
  }, [dispatch]);

  return (
    <div className={styles.container}>
      <NotificationViewer isSelected={view === Page.Notifications} />
      <NavigationButton
        icon="upload"
        isSelected={view === Page.AddCustomData}
        onSelect={() => dispatch(selectPage(Page.AddCustomData))}
        title={isUploadJobInProgress ? "Current Upload" : "New Upload"}
      />
      <NavigationButton
        icon="profile"
        iconTheme="filled"
        isSelected={view === Page.UploadSummary}
        onSelect={() => dispatch(selectPage(Page.UploadSummary))}
        title="Upload Status"
      />
      <NavigationButton
        icon="setting"
        iconTheme="filled"
        isSelected={view === Page.Settings}
        onSelect={() => dispatch(selectView(Page.Settings))}
        title="Settings"
      />
      <SettingsModal visible={view === Page.Settings} />
    </div>
  );
}
