import fs from 'fs';
import * as React from "react";
import { Icon, Modal } from "antd";
import TextArea from "antd/es/input/TextArea";
import { clipboard, OpenDialogOptions, remote } from "electron";
import { DragAndDropFileList } from "../../state/selection/types";
import DragAndDrop from "../DragAndDrop";

interface NoteIconProps {
    notes?: string;
    saveNotes: (notes: string | undefined) => void;
}

interface NoteIconState {
    editing: boolean;
    notes: string;
    showNotes: boolean;
}

const openDialogOptions: OpenDialogOptions = {
    properties: ["openFile"],
    title: "Open Text file",
    filters: [
        { name: 'Text', extensions: ['txt'] },
    ]
};

// TODO: Undo / Redo
// TODO: Drag / Drop on table rows
/*
    This component is for rendering notes related to files and managing different modes of editing them.
    It also contains static methods for reading .txt files from drag or drop events.
 */
class NoteIcon extends React.Component<NoteIconProps, NoteIconState> {
    private readonly iconRef = React.createRef<HTMLDivElement>();
    private readonly menu = remote.Menu.buildFromTemplate([
        {
            label: 'Cut',
            click: () => {
                clipboard.writeText(this.state.notes);
                this.setState({ notes: '' });
                this.props.saveNotes(undefined);
            }
        },
        {
            label: 'Copy',
            click: () => {
                clipboard.writeText(this.state.notes);
            }
        },
        {
            label: 'Paste',
            click: () => {
                const notes = clipboard.readText('clipboard');
                this.setState({ notes });
            }
        },
        {
            label: 'Delete',
            click: () => {
                this.setState({ notes: '' });
                this.props.saveNotes(undefined);
            }
        },
    ]);

    public static onDrop = (files: DragAndDropFileList): string => {
        if (files.length > 1) {
            throw new Error(`Unexpected number of files dropped: ${files.length}.`);
        } else if (files.length < 1) {
            return '';
        }
        return NoteIcon.readFile(files[0].path);
    }

    public static onOpen = (files: string[]): string => {
        if (files.length > 1) {
            throw new Error(`Unexpected number of files opened: ${files.length}.`);
        } else if (files.length < 1) {
            return '';
        }
        return NoteIcon.readFile(files[0]);
    }

    private static readFile = (file: string): string => {
        // Currently it is possible the user selected a directory or an invalid data type
        // in which case it *should* be obvious nothing was read in since the notes will not update
        // and the UI will remain in edit mode, but we might want to alert them - Sean M 7/29/19
        try {
            const notesBuffer = fs.readFileSync(file);
            return notesBuffer.toString();
        } catch (e) {
            console.log(e);
        }
        return '';
    }

    constructor(props: NoteIconProps) {
        super(props);
        this.state = {
            editing: false,
            notes: props.notes || '',
            showNotes: false,
        };
    }

    // We only want to have a 'contextmenu' event when the notes exist so we have to check to see if it does exist
    // before adding it
    public componentDidMount() {
        if (this.state.notes) {
            this.iconRef.current!.addEventListener("contextmenu", this.replaceContextMenu, false);
        }
    }

    // If the ref was not added while mounting and notes have been added since then we want to add the event
    public componentDidUpdate() {
        if (this.state.notes) {
            this.iconRef.current!.addEventListener("contextmenu", this.replaceContextMenu, false);
        }
    }

    public render() {
        return (
            <>
                <Modal
                    width="90%"
                    title={this.state.editing ? 'Add Notes' : 'View Notes'}
                    visible={this.state.showNotes}
                    onOk={this.saveAndClose}
                    onCancel={this.closeModal}
                    okText={this.state.editing ? 'Save' : 'Done'}
                >
                    {this.renderNotes()}
                </Modal>
                {this.state.notes ?
                    <div ref={this.iconRef}>
                        <Icon onClick={this.openModal} type="file-text" />
                    </div>
                    :
                    <Icon onClick={this.startEditing} type="plus-circle" />
                }
            </>
        );
    }

    private renderNotes = () => {
        if (this.state.editing) {
            return (
                <>
                    <TextArea
                        rows={4}
                        placeholder="Notes for the file"
                        onChange={this.updateNotes}
                        value={this.state.notes}
                    />
                    <DragAndDrop
                        openDialogOptions={openDialogOptions}
                        onDrop={this.handleOnDrop}
                        onOpen={this.handleOnOpen}
                    />
                </>
            );
        }
        return (
            <>
                <Icon onClick={this.startEditing} style={{ float: 'right' }} type="form" />
                {/* New line formatting might be important for viewing */}
                {this.state.notes.split('\n').map(line => (
                    <p key={line}>{line}</p>
                ))}
            </>
        )
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
        this.setState({ notes: e.target.value})
    }

    private handleOnDrop = (files: DragAndDropFileList) => {
        const notes = NoteIcon.onDrop(files);
        this.setState({ notes });
    }

    private handleOnOpen = (files: string[]) => {
        const notes = NoteIcon.onOpen(files);
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
        this.menu.popup();
    }
}

export default NoteIcon;
