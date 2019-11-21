import * as React from "react";
import { connect } from "react-redux";

import { OpenDialogOptions } from "electron";
import DragAndDrop from "../../components/DragAndDrop";
import ProgressBar from "../../components/ProgressBar";
import { selection } from "../../state";
import { Page } from "../../state/route/types";
import {
    DragAndDropFileList,
    LoadFilesFromDragAndDropAction,
    LoadFilesFromOpenDialogAction,
} from "../../state/selection/types";

const styles = require("./style.pcss");

interface DragAndDropSquareProps {
    onDrop: (files: DragAndDropFileList) => LoadFilesFromDragAndDropAction;
    onOpen: (files: string[]) => LoadFilesFromOpenDialogAction;
}

// On Windows file browsers cannot look for directories and files at the same time
// directories are the default in that case
const openDialogOptions: OpenDialogOptions = {
    properties: ["openFile", "openDirectory", "multiSelections"],
    title: "Browse for folders, or drag and drop files/folders onto app",
};

const DragAndDropSquare: React.FunctionComponent<DragAndDropSquareProps> = ({
                                                                                onDrop,
                                                                                onOpen,
                                                                            }: DragAndDropSquareProps) => {
    return (
        <div>
            <DragAndDrop
                onDrop={onDrop}
                onOpen={onOpen}
                className={styles.dragAndDropSquare}
                openDialogOptions={openDialogOptions}
            />
            <ProgressBar
                page={Page.DragAndDrop}
            />
        </div>
    );
};

const mapStateToProps = () => ({});

const dispatchToPropsMap = {
    onDrop: selection.actions.loadFilesFromDragAndDrop,
    onOpen: selection.actions.openFilesFromDialog,
};
export default connect(mapStateToProps, dispatchToPropsMap)(DragAndDropSquare);
