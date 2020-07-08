import { Button, Empty, Icon, Spin, Tag, Tooltip, Tree } from "antd";
import * as classNames from "classnames";
import { OpenDialogOptions, remote } from "electron";
import { isEmpty } from "lodash";
import * as React from "react";
import { ActionCreator } from "redux";

import {
  SetAlertAction,
  ToggleFolderTreeAction,
} from "../../state/feedback/types";
import {
  ClearStagedFilesAction,
  DragAndDropFileList,
  GetFilesInFolderAction,
  LoadFilesFromDragAndDropAction,
  LoadFilesFromOpenDialogAction,
  SelectFileAction,
} from "../../state/selection/types";
import { AlertType, UploadFile } from "../../state/types";
import {
  undoFileWellAssociation,
  undoFileWorkflowAssociation,
} from "../../state/upload/actions";
import {
  FileTag,
  FileTagType,
  RemoveFileFromArchiveAction,
  RemoveFileFromIsilonAction,
} from "../../state/upload/types";
import DragAndDrop from "../DragAndDrop";
import Resizable from "../Resizable";

const styles = require("./style.pcss");

interface FolderTreeProps {
  className?: string;
  clearStagedFiles: ActionCreator<ClearStagedFilesAction>;
  files: UploadFile[];
  fileToTags: Map<string, FileTag[]>;
  folderTreeOpen: boolean;
  getFilesInFolder: (folderToExpand: UploadFile) => GetFilesInFolderAction;
  isLoading?: boolean;
  loadFilesFromDragAndDropAction: (
    files: DragAndDropFileList
  ) => LoadFilesFromDragAndDropAction;
  loadFilesFromOpenDialogAction: (
    files: string[]
  ) => LoadFilesFromOpenDialogAction;
  onCheck: (files: string[]) => SelectFileAction;
  removeFileFromArchive: ActionCreator<RemoveFileFromArchiveAction>;
  removeFileFromIsilon: ActionCreator<RemoveFileFromIsilonAction>;
  selectedKeys: string[];
  setAlert: ActionCreator<SetAlertAction>;
  toggleFolderTree: ActionCreator<ToggleFolderTreeAction>;
  undoFileWellAssociation: typeof undoFileWellAssociation;
  undoFileWorkflowAssociation: typeof undoFileWorkflowAssociation;
}

interface FolderTreeState {
  // Keeps track of folders that have been expanded. Used only for preventing duplicate requests to get children.
  expandedFolders: Set<string>;
}

// Added to the keys used for Tree.TreeNode in order to quickly identify folders from files.
const FOLDER_TAG = "(folder)";
const CANT_READ_TAG = "(cant read)";

// On Windows file browsers cannot look for directories and files at the same time
// directories are the default in that case
const openDialogOptions: OpenDialogOptions = {
  properties: ["openFile", "openDirectory", "multiSelections"],
  title: "Browse for folders, or drag and drop files/folders onto app",
};

class FolderTree extends React.Component<FolderTreeProps, FolderTreeState> {
  public static getKey(file: UploadFile): string {
    let key = file.fullPath;
    if (file.isDirectory) {
      key += FOLDER_TAG;
    }
    if (!file.canRead) {
      key += CANT_READ_TAG;
    }
    return key;
  }

  // Recursively searches files and the child files for the first folder whose full path is equivalent to path
  public static getMatchingFolderFromPath(
    files: UploadFile[],
    path: string
  ): UploadFile | null {
    for (const file of files) {
      // we're looking for a folder so don't return anything if file is not a folder.
      if (file.isDirectory) {
        // we've found the folder if the fullPath matches with the path we're searching for
        if (file.fullPath === path) {
          return file;

          // If the path we're searching for starts with the fullPath of the current folder,
          // search the children of that folder.
          // e.g. file.fullPath = "/Users/bob/Documents" and path = "/Users/bob/Documents/secrets"
        } else if (path.startsWith(file.fullPath)) {
          return FolderTree.getMatchingFolderFromPath(file.files, path);
        }
      }
    }

    return null;
  }

  constructor(props: FolderTreeProps) {
    super(props);
    this.state = {
      expandedFolders: new Set<string>(),
    };
  }

  public render() {
    const {
      className,
      clearStagedFiles,
      files,
      folderTreeOpen,
      loadFilesFromDragAndDropAction,
    } = this.props;
    if (!files) {
      return null;
    }

    if (!folderTreeOpen) {
      return (
        <div className={styles.collapsedTree}>
          <Tooltip title="Expand folder tree" mouseLeaveDelay={0}>
            <Button
              icon="caret-right"
              className={styles.collapseButton}
              onClick={this.props.toggleFolderTree}
            />
          </Tooltip>
        </div>
      );
    }

    return (
      <Resizable
        className={classNames(className, styles.container)}
        minimumWidth={360}
        right={true}
        width={360}
      >
        <div className={styles.logoContainer}>
          <Icon type="cloud-upload" className={styles.logo} />
          <span className={styles.brandName}>AICS&nbsp;File&nbsp;Uploader</span>
          <div className={styles.fileButtons}>
            <span className={styles.fileControls}>
              <Tooltip
                title="Browse for files to add to folder tree"
                mouseLeaveDelay={0}
              >
                <Button icon="upload" onClick={this.onBrowse} />
              </Tooltip>
              <Tooltip title="Clear files in folder tree" mouseLeaveDelay={0}>
                <Button
                  disabled={!files.length}
                  icon="stop"
                  onClick={clearStagedFiles}
                />
              </Tooltip>
            </span>
            <Tooltip title="Collapse folder tree" mouseLeaveDelay={0}>
              <Button icon="caret-left" onClick={this.props.toggleFolderTree} />
            </Tooltip>
          </div>
        </div>
        <DragAndDrop
          className={files.length && styles.dragAndDrop}
          openDialogOptions={openDialogOptions}
          onDrop={loadFilesFromDragAndDropAction}
        >
          {this.renderFolderTree()}
        </DragAndDrop>
      </Resizable>
    );
  }

  // Opens native file explorer
  private onBrowse = async () => {
    const { filePaths: filenames } = await remote.dialog.showOpenDialog(
      openDialogOptions
    );
    // If cancel is clicked, this callback gets called and filenames is undefined
    if (filenames && !isEmpty(filenames)) {
      this.props.loadFilesFromOpenDialogAction(filenames);
    }
  };

  private renderFolderTree = () => {
    const { files, isLoading, selectedKeys } = this.props;
    if (isLoading) {
      return <Spin size="large" />;
    }
    if (!files.length) {
      return <Empty className={styles.empty} description="No Files" />;
    }
    return (
      <div className={styles.fileTree}>
        <Tree.DirectoryTree
          checkable={false}
          multiple={true}
          defaultExpandedKeys={files.map((file: UploadFile) =>
            FolderTree.getKey(file)
          )}
          onSelect={this.onSelect}
          onExpand={this.onExpand}
          selectedKeys={selectedKeys.filter(
            (file) => !file.includes(FOLDER_TAG)
          )}
        >
          {files.map((file: UploadFile) => this.renderChildDirectories(file))}
        </Tree.DirectoryTree>
      </div>
    );
  };

  // Select files; Excludes any folders and any files the user doesn't have permission to read
  private onSelect = (files: string[]) => {
    const nonReadableFiles = files.filter(
      (file: string) => !file.includes(CANT_READ_TAG)
    );
    if (nonReadableFiles.length) {
      this.props.setAlert({
        message: `You have selected files that you do not have permission for: ${nonReadableFiles}`,
        type: AlertType.WARN,
      });
    }
    const selectableFiles = files.filter(
      (file: string) =>
        !file.includes(FOLDER_TAG) && !file.includes(CANT_READ_TAG)
    );
    if (selectableFiles.length) {
      this.props.onCheck(selectableFiles);
    }
  };

  private onExpand = (expandedKeys: string[]): void => {
    // find UploadFile to send
    expandedKeys.forEach((key) => {
      // prevents us from requesting child files/directories more than once
      if (!this.state.expandedFolders.has(key)) {
        this.setState({ expandedFolders: this.state.expandedFolders.add(key) });
        const filePath: string = key.slice(0, -FOLDER_TAG.length);
        const folderToUpdate = FolderTree.getMatchingFolderFromPath(
          this.props.files,
          filePath
        );

        if (folderToUpdate) {
          this.props.getFilesInFolder(folderToUpdate);
        }
      }
    });
  };

  private removeTag = (tag: FileTag, fullpath: string) => (): void => {
    // If the tag type is well or workflow, `wellId` or `workflow` should be
    // present. We check below to make sure.
    if (tag.type === FileTagType.WELL && tag.wellId) {
      this.props.undoFileWellAssociation({ file: fullpath }, true, [
        tag.wellId,
      ]);
    } else if (tag.type === FileTagType.WORKFLOW && tag.workflow) {
      this.props.undoFileWorkflowAssociation(fullpath, [tag.workflow]);
    } else if (tag.type === FileTagType.STORAGE) {
      if (tag.title.toLowerCase() === "archive") {
        this.props.removeFileFromArchive(fullpath);
      } else {
        this.props.removeFileFromIsilon(fullpath);
      }
    }
  };

  private renderChildDirectories(file: UploadFile): React.ReactNode {
    const wrapNoPermissionTooltip = (
      children: React.ReactNode | React.ReactNodeArray
    ) => (
      <Tooltip
        key={FolderTree.getKey(file)}
        title="You do not have permissions for this file/directory"
      >
        <span>{children}</span>
      </Tooltip>
    );
    if (!file.isDirectory) {
      const { fileToTags } = this.props;
      const fileName: JSX.Element = (
        <span className={styles.fileName}>{file.name}</span>
      );
      const tags: FileTag[] | undefined = fileToTags.get(file.fullPath);
      let tagEls;
      if (tags) {
        tagEls = tags.map((tag) => (
          <Tag
            className={styles.tagSpacing}
            closable={tag.closable}
            color={tag.color}
            key={tag.title}
            onClose={this.removeTag(tag, file.fullPath)}
          >
            {tag.title}
          </Tag>
        ));
      }

      const fileDisplay = (
        <>
          <span>{fileName}</span>
          {tagEls}
        </>
      );
      return (
        <Tree.TreeNode
          className={styles.treeNode}
          disabled={!file.canRead}
          isLeaf={true}
          key={FolderTree.getKey(file)}
          title={
            file.canRead ? fileDisplay : wrapNoPermissionTooltip(fileDisplay)
          }
        />
      );
    }

    return (
      <Tree.TreeNode
        className={styles.treeNode}
        disabled={!file.canRead}
        isLeaf={false}
        key={FolderTree.getKey(file)}
        title={file.canRead ? file.name : wrapNoPermissionTooltip(file.name)}
      >
        {file.files.map((child: UploadFile) =>
          this.renderChildDirectories(child)
        )}
      </Tree.TreeNode>
    );
  }
}

export default FolderTree;
