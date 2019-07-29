import * as React from "react";
import {connect} from "react-redux";

import {selection} from "../../state";
import {
    DragAndDropFileList,
    LoadFilesFromDragAndDropAction,
    LoadFilesFromOpenDialogAction,
} from "../../state/selection/types";
import DragAndDrop from "../../components/DragAndDrop";
import {OpenDialogOptions} from "electron";

interface DragAndDropSquareProps {
    className?: string;
    onDrop: (files: DragAndDropFileList) => LoadFilesFromDragAndDropAction;
    onOpen: (files: string[]) => LoadFilesFromOpenDialogAction;
}

const openDialogOptions: OpenDialogOptions = {
    properties: ["openFile", "openDirectory", "multiSelections"],
    title: "Open files",
};

const DragAndDropSquare: React.FunctionComponent<DragAndDropSquareProps> = ({ className, onDrop, onOpen }: DragAndDropSquareProps) => {
    return (
        <DragAndDrop
            openDialogOptions={openDialogOptions}
            className={className}
            onDrop={onDrop}
            onOpen={onOpen}
        />
    );
};

const mapStateToProps = () => ({});

const dispatchToPropsMap = {
    onDrop: selection.actions.loadFilesFromDragAndDrop,
    onOpen: selection.actions.openFilesFromDialog,
};
export default connect(mapStateToProps, dispatchToPropsMap)(DragAndDropSquare);
