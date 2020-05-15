import { Button, Icon } from "antd";
import * as classNames from "classnames";
import { OpenDialogOptions, remote } from "electron";
import * as React from "react";

import { isEmpty } from "lodash";
import { DragAndDropFileList } from "../../state/selection/types";

const styles = require("../../components/DragAndDrop/style.pcss");

interface DragAndDropProps {
  children?: React.ReactNode | React.ReactNodeArray;
  openDialogOptions: OpenDialogOptions;
  className?: string;
  onDrop: (files: DragAndDropFileList) => void;
  onOpen?: (files: string[]) => void;
}

interface DragAndDropState {
  // Keeps track of net number of drag events into component.
  // Used to determine if the element is being hovered or not.
  // This is guaranteed to be 1 or greater when a file is hovered within this component.
  // Making this a boolean doesn't work because child elements will also fire
  // drag/drop events (and this can't be prevented).
  dragEnterCount: number;
}

class DragAndDrop extends React.Component<DragAndDropProps, DragAndDropState> {
  private static onDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    // Not having this was causing issues when > 1 divs with onDrag were layered
    e.preventDefault();
  };

  constructor(props: DragAndDropProps) {
    super(props);
    this.state = {
      dragEnterCount: 0,
    };
  }

  public render() {
    const { children, className } = this.props;

    return (
      <div
        className={classNames(
          styles.container,
          { [styles.highlight]: this.isHovered },
          className
        )}
        onDragEnter={this.onDragEnter}
        onDragLeave={this.onDragLeave}
        onDragEnd={this.onDragLeave}
        onDrop={this.onDrop}
        onDragOver={DragAndDrop.onDragOver}
      >
        {children || (
          <div className={styles.content}>
            <>
              <Icon type="upload" className={styles.uploadIcon} />
              <div>Drag&nbsp;and&nbsp;Drop</div>
              <div>- or -</div>
              <Button onClick={this.onBrowse}>Browse</Button>
            </>
          </div>
        )}
      </div>
    );
  }

  // Opens native file explorer
  private onBrowse = (): void => {
    const { onOpen } = this.props;
    if (!onOpen) {
      throw new Error(
        "Browsing for a file is not configured. Contact Software"
      );
    }
    remote.dialog.showOpenDialog(
      this.props.openDialogOptions,
      (filenames?: string[]) => {
        // If cancel is clicked, this callback gets called and filenames is undefined
        if (filenames && !isEmpty(filenames)) {
          onOpen(filenames);
        }
      }
    );
  };

  private onDragEnter = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    this.setState({ dragEnterCount: this.state.dragEnterCount + 1 });
  };

  private onDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    this.setState({ dragEnterCount: this.state.dragEnterCount - 1 });
  };

  private onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    this.setState({ dragEnterCount: 0 });
    this.props.onDrop(e.dataTransfer.files);
  };

  get isHovered(): boolean {
    return this.state.dragEnterCount > 0;
  }
}

export default DragAndDrop;
