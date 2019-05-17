import {
    Button,
    Icon,
} from "antd";
import * as classNames from "classnames";
import {
    OpenDialogOptions,
    remote,
} from "electron";
import { isEmpty } from "lodash";
import * as React from "react";
import { connect } from "react-redux";

import { selection } from "../../state";
import {
    DragAndDropFileList,
    LoadFilesFromDragAndDropAction,
    LoadFilesFromOpenDialogAction,
} from "../../state/selection/types";

const styles = require("./style.pcss");

interface DragAndDropSquareProps {
    className?: string;
    onDrop: (files: DragAndDropFileList) => LoadFilesFromDragAndDropAction;
    onOpen: (files: string[]) => LoadFilesFromOpenDialogAction;
}

interface DragAndDropSquareState {
    // Keeps track of net number of drag events into component.
    // Used to determine if the element is being hovered or not.
    // This is guaranteed to be 1 or greater when a file is hovered within this component.
    // Making this a boolean doesn't work because child elements will also fire
    // drag/drop events (and this can't be prevented).
    dragEnterCount: number;
}

class DragAndDropSquare extends React.Component<DragAndDropSquareProps, DragAndDropSquareState> {
    constructor(props: DragAndDropSquareProps) {
        super(props);
        this.state = {
            dragEnterCount: 0,
        };
        this.onDrop = this.onDrop.bind(this);
        this.onDragEnter = this.onDragEnter.bind(this);
        this.onDragLeave = this.onDragLeave.bind(this);
        this.onBrowse = this.onBrowse.bind(this);
    }

    public render() {
        const {
            className,
        } = this.props;

        return (
            <div
                className={classNames(styles.container, {[styles.highlight]: this.isHovered}, className)}
                onDragEnter={this.onDragEnter}
                onDragLeave={this.onDragLeave}
                onDragEnd={this.onDragLeave}
                onDrop={this.onDrop}
            >
                <div className={styles.content}>
                    <Icon type="upload" className={styles.uploadIcon} />
                    <div>Drag&nbsp;and&nbsp;Drop</div>
                    <div>- or -</div>
                    <Button type="primary" size="large" onClick={this.onBrowse} className={styles.button}>
                        Browse
                    </Button>
                </div>
            </div>
        );
    }

    // Opens native file explorer
    private onBrowse(): void {
        const options: OpenDialogOptions = {
            properties: ["openFile", "openDirectory", "multiSelections"],
            title: "Open files",
        };

        remote.dialog.showOpenDialog(options, (filenames?: string[]) => {
            // If cancel is clicked, this callback gets called and filenames is undefined
            if (filenames && !isEmpty(filenames)) {
                this.props.onOpen(filenames);
            }
        });
    }

    private onDragEnter(e: React.DragEvent<HTMLDivElement>): void {
        e.preventDefault();
        this.setState({dragEnterCount: this.state.dragEnterCount + 1});
    }

    private onDragLeave(e: React.DragEvent<HTMLDivElement>): void {
        e.preventDefault();
        this.setState({dragEnterCount: this.state.dragEnterCount - 1});
    }

    private onDrop(e: React.DragEvent<HTMLDivElement>): void {
        e.preventDefault();
        this.setState({dragEnterCount: 0});
        this.props.onDrop(e.dataTransfer.files);
    }

    get isHovered(): boolean {
        return this.state.dragEnterCount > 0;
    }
}

const mapStateToProps = () => ({});

const dispatchToPropsMap = {
    onDrop: selection.actions.loadFilesFromDragAndDrop,
    onOpen: selection.actions.openFilesFromDialog,
};
export default connect(mapStateToProps, dispatchToPropsMap)(DragAndDropSquare);
