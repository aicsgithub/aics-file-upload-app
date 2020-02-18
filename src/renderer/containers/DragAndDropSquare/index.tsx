import { OpenDialogOptions } from "electron";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import DragAndDrop from "../../components/DragAndDrop";
import FormPage from "../../components/FormPage";
import { selection } from "../../state";
import { goBack, goForward } from "../../state/route/actions";
import { GoBackAction, NextPageAction, Page } from "../../state/route/types";
import {
    DragAndDropFileList,
    LoadFilesFromDragAndDropAction,
    LoadFilesFromOpenDialogAction,
} from "../../state/selection/types";

interface DragAndDropSquareProps {
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
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
                                                                                goBack: goBackProp,
                                                                                goForward: goForwardProp,
                                                                                onDrop,
                                                                                onOpen,
                                                                            }: DragAndDropSquareProps) => {
    return (
        <FormPage
            formTitle="Drag and Drop"
            formPrompt="Drag and drop files or click Browse"
            onBack={goBackProp}
            onSave={goForwardProp}
            page={Page.DragAndDrop}
        >
            <DragAndDrop
                onDrop={onDrop}
                onOpen={onOpen}
                openDialogOptions={openDialogOptions}
            />
        </FormPage>
    );
};

const mapStateToProps = () => ({});

const dispatchToPropsMap = {
    goBack,
    goForward,
    onDrop: selection.actions.loadFilesFromDragAndDrop,
    onOpen: selection.actions.openFilesFromDialog,
};
export default connect(mapStateToProps, dispatchToPropsMap)(DragAndDropSquare);
