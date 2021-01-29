import { Icon } from "antd";
import React from "react";

import NotificationViewer from "../../containers/NotificationViewer";
import { Page } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
  selectView: (view: Page) => void;
  view: Page;
}

interface PageButton {
  isSelected: boolean;
  representation?: React.ReactNode;
  title: string;
  type: string;
}

export default function NavigationBar(props: Props) {
  const pageButtons: PageButton[] = [
    {
      title: "Notifications",
      type: "check",
      isSelected: props.view === Page.DragAndDrop,
      representation: <NotificationViewer />,
    },
    {
      title: "Upload",
      type: "check",
      isSelected:
        props.view === Page.UploadSummary || props.view === Page.AddCustomData,
    },
    {
      title: "Settings",
      type: "check",
      isSelected:
        props.view === Page.UploadSummary || props.view === Page.AddCustomData,
    },
  ];
  return (
    <div className={styles.container}>
      {pageButtons.map(
        (button) =>
          button.representation || (
            <div className={styles.button}>
              <Icon
                className={
                  button.isSelected ? styles.selectedButton : undefined
                }
                type={button.type}
              />
              <div>{button.title}</div>
            </div>
          )
      )}
    </div>
  );
}
