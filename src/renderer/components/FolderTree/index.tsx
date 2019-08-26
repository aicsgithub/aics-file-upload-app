import { Icon, Spin, Tag, Tree } from "antd";
import * as classNames from "classnames";
import * as React from "react";

import { GetFilesInFolderAction, SelectFileAction, UploadFile } from "../../state/selection/types";
import { FileTag } from "../../state/upload/types";
import Resizable from "../Resizable";

const styles = require("./style.pcss");

interface FolderTreeProps {
    className?: string;
    files: UploadFile[];
    getFilesInFolder: (folderToExpand: UploadFile) => GetFilesInFolderAction;
    isLoading?: boolean;
    onCheck: (files: string[]) => SelectFileAction;
    selectedKeys: string[];
    fileToTags: Map<string, FileTag[]>;
}

interface FolderTreeState {
    // Keeps track of folders that have been expanded. Used only for preventing duplicate requests to get children.
    expandedFolders: Set<string>;
}

// Added to the keys used for Tree.TreeNode in order to quickly identify folders from files.
const FOLDER_TAG = "(folder)";

class FolderTree extends React.Component<FolderTreeProps, FolderTreeState> {
    public static getFolderKey(path: string): string {
        return `${path}${FOLDER_TAG}`;
    }

    // Recursively searches files and the child files for the first folder whose full path is equivalent to path
    public static getMatchingFolderFromPath(files: UploadFile[], path: string): UploadFile | null {
        for (const file of files) {
            // we're looking for a folder so don't return anything if file is not a folder.
            if (file.isDirectory) {

                // we've found the folder if the fullPath matches with the path we're searching for
                if (file.fullPath === path) {
                    return file;

                // If the path we're searching for starts with the fullPath of the current folder,
                // search the children of that folder.
                // e.g. file.fullPath = "/Users/bob/Documents" and path = "/Users/bob/Documents/secrets"
                } else if (path.indexOf(file.fullPath) === 0) {
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

        this.onExpand = this.onExpand.bind(this);
        this.onSelect = this.onSelect.bind(this);
    }

    public render() {
        const {
            className,
            files,
            isLoading,
            selectedKeys,
        } = this.props;

        if (!files) {
            return null;
        }

        return (
            <Resizable className={classNames(className, styles.container)} minimumWidth={375} right={true} width={375}>
                <div className={styles.logoContainer}>
                    <Icon type="cloud-upload" className={styles.logo}/>
                    <span className={styles.brandName}>AICS&nbsp;File&nbsp;Uploader</span>
                </div>
                <div className={styles.fileTree}>
                    {!isLoading && <Tree.DirectoryTree
                        checkable={false}
                        multiple={true}
                        defaultExpandedKeys={files.map((file: UploadFile) => FolderTree.getFolderKey(file.fullPath))}
                        onSelect={this.onSelect}
                        onExpand={this.onExpand}
                        selectedKeys={selectedKeys.filter((file) => !file.includes(FOLDER_TAG))}
                    >
                        {files.map((file: UploadFile) => this.renderChildDirectories(file))}
                    </Tree.DirectoryTree>}
                    {isLoading && <Spin size="large"/>}
                </div>
            </Resizable>
        );
    }

    private onSelect(files: string[]) {
        const filesExcludingFolders = files.filter((file: string) => !file.includes(FOLDER_TAG));
        this.props.onCheck(filesExcludingFolders);
    }

    private onExpand(expandedKeys: string[]): void {
        // find UploadFile to send
        expandedKeys.forEach((key) => {
            // prevents us from requesting child files/directories more than once
            if (!this.state.expandedFolders.has(key)) {
                this.setState({expandedFolders: this.state.expandedFolders.add(key)});
                const filePath: string = key.slice(0, -FOLDER_TAG.length);
                const folderToUpdate = FolderTree.getMatchingFolderFromPath(this.props.files, filePath);

                if (folderToUpdate) {
                    this.props.getFilesInFolder(folderToUpdate);
                }
            }
        });
    }

    private renderChildDirectories(file: UploadFile): React.ReactNode {
        if (!file.isDirectory) {
            const {fileToTags} = this.props;
            const fileName: JSX.Element = <span className={styles.fileName}>{file.name}</span>;
            const tags: FileTag[] | undefined = fileToTags.get(file.fullPath);
            let tagEls;
            if (tags) {
                tagEls = tags.map(
                    (tag: { title: string, color: string }) => (
                        <Tag color={tag.color} key={tag.title}>{tag.title}</Tag>
                    ));
            }

            const fileDisplay = (
                <React.Fragment>
                    <span>{fileName}</span>
                    {tagEls}
                </React.Fragment>
            );
            return <Tree.TreeNode
                className={styles.treeNode}
                selectable={file.canRead}
                disabled={!file.canRead}
                isLeaf={true}
                key={file.fullPath}
                title={fileDisplay}
            />;
        }

        return (
            <Tree.TreeNode
                disabled={!file.canRead}
                title={file.name}
                key={FolderTree.getFolderKey(file.fullPath)}
                isLeaf={false}
                className={styles.treeNode}
            >
                {file.files.map((child: UploadFile) => this.renderChildDirectories(child))}
            </Tree.TreeNode>
        );
    }
}

export default FolderTree;
