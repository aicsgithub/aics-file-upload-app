import React from "react";
import { useDispatch, useSelector } from "react-redux";

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

  return (
    <div className={styles.container}>
      <NotificationViewer />
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
      <SettingsModal
        key={`${view === Page.Settings}`}
        visible={view === Page.Settings}
      />
    </div>
  );
}
