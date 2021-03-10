import { Button, Icon } from "antd";
import * as classNames from "classnames";
import { OpenDialogOptions, remote } from "electron";
import { isEmpty } from "lodash";
import * as React from "react";

import { DragAndDropFileList } from "../../state/types";

const styles = require("../../components/DragAndDrop/style.pcss");

interface DragAndDropProps {
  children?: React.ReactNode | React.ReactNodeArray;
  disabled?: boolean;
  openDialogOptions: OpenDialogOptions;
  className?: string;
  overlayChildren?: boolean;
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
    if (this.props.disabled) {
      return (
        <div className={classNames(styles.container, this.props.className)}>
          {this.props.children}
        </div>
      );
    }

    return (
      <div
        className={classNames(styles.container, this.props.className)}
        onDragEnter={this.onDragEnter}
        onDragLeave={this.onDragLeave}
        onDragEnd={this.onDragLeave}
        onDrop={this.onDrop}
        onDragOver={DragAndDrop.onDragOver}
      >
        {this.renderContent()}
        <div className={this.isHovered ? styles.highlight : undefined} />
      </div>
    );
  }

  private renderContent = (): React.ReactNode | React.ReactNodeArray => {
    if (!this.props.overlayChildren && this.props.children) {
      return this.props.children;
    }

    const dragAndDropPrompt = (
      <div className={styles.content}>
        <>
          <Icon type="upload" className={styles.uploadIcon} />
          <div>Drag&nbsp;and&nbsp;Drop</div>
          <div>- or -</div>
          <Button
            disabled={!this.props.openDialogOptions}
            onClick={this.onBrowse}
          >
            Browse
          </Button>
        </>
      </div>
    );

    if (!this.props.children) {
      return dragAndDropPrompt;
    }

    if (this.props.children && this.props.overlayChildren) {
      return (
        <>
          <div className={styles.overlay}>{this.props.children}</div>
          <div className={styles.overlayPrompt}>{dragAndDropPrompt}</div>
        </>
      );
    }

    return dragAndDropPrompt;
  };

  // Opens native file explorer
  private onBrowse = async (): Promise<void> => {
    const { onOpen } = this.props;
    if (!onOpen) {
      throw new Error(
        "Browsing for a file is not configured. Contact Software"
      );
    }
    const { filePaths: filenames } = await remote.dialog.showOpenDialog(
      this.props.openDialogOptions
    );
    // If cancel is clicked, this callback gets called and filenames is undefined
    if (filenames && !isEmpty(filenames)) {
      onOpen(filenames);
    }
  };

  private onDragEnter = (e: React.DragEvent<HTMLDivElement>): void => {
    // Ignore non-file drag events
    if (
      e.dataTransfer.items.length &&
      e.dataTransfer.items[0].kind === "file"
    ) {
      e.preventDefault();
      // Prevent drag and drop events from stacking (like notes over upload job page)
      e.stopPropagation();
      this.setState({ dragEnterCount: this.state.dragEnterCount + 1 });
    }
  };

  private onDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    // Ignore non-file drag events
    if (
      e.dataTransfer.items.length &&
      e.dataTransfer.items[0].kind === "file"
    ) {
      e.preventDefault();
      // Prevent drag and drop events from stacking (like notes over upload job page)
      e.stopPropagation();
      this.setState({
        dragEnterCount:
          // Ensure the drag enter count can never be negative since that would require
          // a file originating from the file upload app and moved elsewhere
          this.state.dragEnterCount - 1 <= 0
            ? 0
            : this.state.dragEnterCount - 1,
      });
    }
  };

  private onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    // Ignore empty drop events
    if (e.dataTransfer.files.length) {
      e.preventDefault();
      // Prevent drag and drop events from stacking (like notes over upload job page)
      e.stopPropagation();
      this.setState({ dragEnterCount: 0 });
      this.props.onDrop(e.dataTransfer.files);
    }
  };

  get isHovered(): boolean {
    return this.state.dragEnterCount > 0;
  }
}

export default DragAndDrop;
