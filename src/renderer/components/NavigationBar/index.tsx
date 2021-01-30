import { Button, Icon } from "antd";
import classNames from "classnames";
import React from "react";

import NotificationViewer from "../../containers/NotificationViewer";
import { Page } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
  page: Page;
  selectView: (view: Page) => void;
  view: Page;
}

export default function NavigationBar(props: Props) {
  const isUploadViewActive =
    props.view === Page.AddCustomData || props.view === Page.UploadSummary;
  console.log(isUploadViewActive);
  return (
    <div className={styles.container}>
      <NotificationViewer
        className={classNames(
          styles.button,
          !isUploadViewActive ? styles.selectedButton : undefined
        )}
      />
      <Button
        className={classNames(
          styles.button,
          isUploadViewActive ? styles.selectedButton : undefined
        )}
        onClick={() => props.selectView(props.page)}
      >
        <Icon className={styles.buttonIcon} type="upload" title="Upload" />
        <div className={styles.buttonTitle}>Upload</div>
      </Button>
    </div>
  );
}
