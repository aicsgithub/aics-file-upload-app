import { Icon, Modal } from "antd";
import TextArea from "antd/es/input/TextArea";
import { clipboard, OpenDialogOptions, remote } from "electron";
import * as React from "react";

import { DragAndDropFileList } from "../../state/selection/types";
import { onDrop, onOpen } from "../../util";
import DragAndDrop from "../DragAndDrop";

const styles = require("./styles.pcss");

interface NoteIconProps {
    handleError: (error: string) => void;
    notes?: string;
    saveNotes: (notes: string | undefined) => void;
}

interface NoteIconState {
    editing: boolean;
    notes: string;
    showNotes: boolean;
}

// Only want user to be able to select 1 file & it must be of type .txt
const openDialogOptions: OpenDialogOptions = {
    filters: [
        { name: "Text", extensions: ["txt"] },
    ],
    properties: ["openFile"],
    title: "Open Text file",
};

/*
    This component is for rendering notes related to files and managing different modes of editing them.
    It also contains static methods for reading .txt files from drag or drop events.
 */
class NoteIcon extends React.Component<NoteIconProps, NoteIconState> {
    private readonly iconRef = React.createRef<HTMLDivElement>();
    private readonly paste = {
        click: () => {
            const notes = clipboard.readText("clipboard");
            this.props.saveNotes(notes);
        },
        label: "Paste",
    };
    private readonly pasteMenu = remote.Menu.buildFromTemplate([this.paste]);
    private readonly fullMenu = remote.Menu.buildFromTemplate([
        {
            click: () => {
                clipboard.writeText(this.state.notes);
                this.props.saveNotes(undefined);
            },
            label: "Cut",
        },
        {
            click: () => {
                clipboard.writeText(this.state.notes);
            },
            label: "Copy",
        },
        this.paste,
        {
            click: () => {
                this.props.saveNotes(undefined);
            },
            label: "Delete",
        },
    ]);

    constructor(props: NoteIconProps) {
        super(props);
        this.state = {
            editing: false,
            notes: props.notes || "",
            showNotes: false,
        };
    }

    public componentDidMount() {
        this.iconRef.current!.addEventListener("contextmenu", this.replaceContextMenu, false);
    }

    // We want to manage our own state because we want the aspect of "saving" notes & "canceling" them
    // So here we are updating if we are not editing assuming that if we are not editing the store must
    // have the source of truth now (this allows for drag and drop on table rows & cut/copy/paste/delete actions)
    public componentDidUpdate() {
        const propNotes = this.props.notes || "";
        if (!this.state.editing && propNotes !== this.state.notes) {
            this.setState({ notes: propNotes });
        }
    }

    public render() {
        return (
            <>
                <Modal
                    width="90%"
                    title={this.state.editing ? "Add Notes" : "View Notes"}
                    visible={this.state.showNotes}
                    onOk={this.saveAndClose}
                    onCancel={this.closeModal}
                    okText={this.state.editing ? "Save" : "Done"}
                >
                    {this.renderNotes()}
                </Modal>
                <div className={styles.alignCenter} ref={this.iconRef}>
                    {this.state.notes ?
                        <Icon onClick={this.openModal} type="file-text" />
                        :
                        <Icon onClick={this.startEditing} type="plus-circle" />
                    }
                </div>
            </>
        );
    }

    private renderNotes = () => {
        if (this.state.editing) {
            return (
                <>
                    <TextArea
                        className={styles.useFullWidth}
                        onChange={this.updateNotes}
                        placeholder="Type notes for file here or drag/drop a file below"
                        autosize={{ minRows: 4, maxRows: 12 }}
                        value={this.state.notes}
                    />
                    <p className={styles.dragAndDropNote}><strong>Note:</strong> Notes must be file type .txt</p>
                    <DragAndDrop
                        onDrop={this.handleOnDrop}
                        onOpen={this.handleOnOpen}
                        openDialogOptions={openDialogOptions}
                    />
                </>
            );
        }
        return (
            <>
                <Icon onClick={this.startEditing} style={{ float: "right" }} type="form" />
                {/* New line formatting might be important for viewing, so preserve it in view */}
                {this.state.notes.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                ))}
            </>
        );
    }

    private openModal = () => {
        this.setState({ showNotes: true });
    }

    private closeModal = () => {
        this.setState({ editing: false, showNotes: false });
    }

    private startEditing = () => {
        this.setState({ editing: true, showNotes: true });
    }

    private updateNotes = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({ notes: e.target.value});
    }

    private handleOnDrop = async (files: DragAndDropFileList) => {
        const notes = await onDrop(files, this.props.handleError);
        this.setState({ notes });
    }

    private handleOnOpen = async (files: string[]) => {
        const notes = await onOpen(files, this.props.handleError);
        this.setState({ notes });
    }

    private saveAndClose = () => {
        // Don't want to pass up null or empty string -- prefer undefined
        this.props.saveNotes(this.state.notes || undefined);
        this.closeModal();
    }

    // Replaces right-click menu on 'contextmenu' events with an Electron menu
    private replaceContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        // We want all options if there is are notes, but only paste if there isn't
        if (this.state.notes) {
            this.fullMenu.popup();
        } else {
            this.pasteMenu.popup();
        }
    }
}

export default NoteIcon;
