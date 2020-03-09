import { Alert, Icon, Modal, Select, Tooltip } from "antd";
import { isEmpty, isNil, uniq } from "lodash";
import { basename } from "path";
import * as React from "react";

import { Channel } from "../../../state/metadata/types";
import { UploadJobTableRow } from "../../../state/upload/types";

import LabeledInput from "../../LabeledInput";
import PrinterFormatInput from "../../PrinterFormatInput";
import { FormatterProps } from "../index";

const styles = require("./styles.pcss");

interface Props extends FormatterProps<UploadJobTableRow> {
    addScenes: (files: string[], positionIndexes: number[], channels: Channel[]) => void;
    channelOptions: Channel[];
    fileOptions: string[];
}

interface FileFormatterState {
    errorMessage?: string;
    files: string[];
    scenes: string;
    showModal: boolean;
    subImageNames: string[];
    positionIndexes: string;
    channels: Channel[];
}

/**
 * This is used in the custom data grid. It displays a file path within a grid cell and provides a button that
 * opens a modal to add scenes and channels to the file.
 */
class FileFormatter extends React.Component<Props, FileFormatterState> {
    private static convertChannels(channelIds: number[] = [], channelOptions: Channel[]): Channel[] {
        return channelIds
            .map((id: number) => channelOptions.find((o: Channel) => o.channelId === id))
            .filter(Boolean) as Channel[];
    }

    private static convertListToString(positionIndexes: Array<number | string> = []): string {
        return positionIndexes ? positionIndexes.join(", ") : "";
    }

    private static isEditing({ channelIds, positionIndexes }: UploadJobTableRow): boolean {
        return !isEmpty(channelIds) || !isEmpty(positionIndexes);
    }

    constructor(props: Props) {
        super(props);
        this.state = {
            ...this.getInitialState(),
            showModal: false,
        };
    }

    public componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<FileFormatterState>): void {
        if (prevState.showModal !== this.state.showModal && this.state.showModal) {
            this.setState(this.getInitialState());
        }
    }

    public render() {
        const {
            channelOptions,
            fileOptions,
            row,
            value,
        } = this.props;
        const {
            channels,
            files,
            errorMessage,
            positionIndexes,
            scenes,
            showModal,
            subImageNames,
        } = this.state;

        if (row.channel) {
            const channelName = row.channel.name;
            const content = isNil(row.positionIndex) ? `${channelName} (all positions)` :
                `Position ${row.positionIndex}, ${channelName}`;
            return <Tooltip mouseLeaveDelay={0} title={value} className={styles.container}>{content}</Tooltip>;
        }

        if (!isNil(row.positionIndex)) {
            return (
                <Tooltip mouseLeaveDelay={0} title={value} className={styles.container}>
                    Position {row.positionIndex}
                </Tooltip>
            );
        }

        const fileName = basename(value);
        const isEditing = FileFormatter.isEditing(row);
        const action = isEditing ? "Update" : "Add";
        const title = `${action} SubImage or Channel to "${fileName}"`;

        return (
            <div>
                <Tooltip mouseLeaveDelay={0} title={value} className={styles.fileCell}>
                    <span className={styles.fileCellText}>{fileName}</span>
                    <Icon
                        className={styles.addSceneIcon}
                        onClick={this.openModal}
                        type={isEditing ? "edit" : "plus-circle"}
                    />
                </Tooltip>
                <Modal
                    width="50%"
                    title={title}
                    visible={showModal}
                    onOk={this.addFilesScenesAndChannels}
                    onCancel={this.closeModal}
                    okText={action}
                    okButtonProps={{disabled: this.getOkButtonDisabled()}}
                >
                    <p className={styles.modalHelpText}>
                        If this is a microscopy image (3i, czi, ome.tiff, lif) you can add scenes, positions,
                        sub images or channels. This will allow you to add annotations for specific scenes and
                        channels within a file.
                    </p>
                    <Alert
                        className={styles.alert}
                        type="warning"
                        showIcon={true}
                        closable={true}
                        message="Adding scenes, positions, or sub image names will clear out direct file-well associations made on the previous page"
                    />
                    {this.state.files.length > 1 && (
                        <Alert
                            className={styles.alert}
                            type="warning"
                            showIcon={true}
                            closable={true}
                            message="Adding scenes/channels to other files removes scenes/channels they already have"
                        />
                    )}
                    <LabeledInput label="Files">
                        <Select
                            className={styles.input}
                            allowClear={true}
                            onChange={this.selectFiles}
                            placeholder="Select Files"
                            mode="tags"
                            value={files}
                        >
                            {fileOptions.map((file: string) => (
                                <Select.Option key={file} value={file}>
                                    {file}
                                </Select.Option>
                            ))}
                        </Select>
                    </LabeledInput>
                    <LabeledInput label="Scenes (ex. 1, 4, 5-10)">
                        <PrinterFormatInput
                            value={scenes}
                            onEnter={this.enterScenes}
                            placeholder="Enter Scenes"
                        />
                    </LabeledInput>
                    <LabeledInput label="Positions (ex. 1, 4, 5-10)">
                        <PrinterFormatInput
                            value={positionIndexes}
                            onEnter={this.enterPositionIndexes}
                            placeholder="Enter Positions"
                        />
                    </LabeledInput>
                    <LabeledInput label="Channels">
                        <Select
                            className={styles.input}
                            allowClear={true}
                            onChange={this.selectChannel}
                            placeholder="Select Channels"
                            mode="tags"
                            value={channels.map((channel) => channel.name)}
                        >
                            {channelOptions.map(({ name }: Channel) => (
                                <Select.Option key={name} value={name}>
                                    {name}
                                </Select.Option>
                            ))}
                        </Select>
                    </LabeledInput>
                    <LabeledInput label="Sub Image Names">
                        <Select
                            className={styles.input}
                            mode="tags"
                            onChange={this.setSubImageNames}
                            placeholder="Sub Image Names"
                            value={subImageNames}
                        />
                    </LabeledInput>
                    {errorMessage && (<Alert
                        className={styles.alert}
                        type="error"
                        showIcon={true}
                        message={errorMessage}
                    />)}
                </Modal>
            </div>
        );
    }

    private openModal = () => this.setState({showModal: true});

    private closeModal = () => this.setState({
        showModal: false,
    })

    private getInitialState = () => {
        const {channelOptions, row: {channelIds, file, positionIndexes, scenes, subImageNames}} = this.props;
        return {
            channels: FileFormatter.convertChannels(channelIds, channelOptions),
            files: [file],
            positionIndexes: FileFormatter.convertListToString(positionIndexes),
            scenes: FileFormatter.convertListToString(scenes),
            subImageNames,
        };
    }

    private addFilesScenesAndChannels = () => {
        const { channels, files, positionIndexes } = this.state;
        const scenes = PrinterFormatInput.extractValues(positionIndexes);
        this.props.addScenes(files, scenes || [], channels);
        this.setState({ showModal: false });
    }

    private selectFiles = (selectedFiles: string[]) => {
        const { fileOptions, row: { file } } = this.props;
        const files = selectedFiles.filter((selectedFile) => fileOptions.includes(selectedFile));
        this.setState({ files: uniq([ file, ...files]) });
    }

    private selectChannel = (names: string[]) => {
        const channels = this.props.channelOptions.filter((channel) => names.includes(channel.name));
        this.setState({ channels });
    }

    private enterScenes = (scenes: string, errorMessage?: string) => {
        this.setState({ scenes, errorMessage });
    }

    private enterPositionIndexes = (positionIndexes: string, errorMessage?: string) => {
        this.setState({ positionIndexes, errorMessage });
    }

    private setSubImageNames = (subImageNames: string[]) => {
        this.setState({ subImageNames });
    }

    private getOkButtonDisabled = (): boolean => {
        const { channels, positionIndexes, scenes, subImageNames } = this.state;
        const validationError: boolean = Boolean(PrinterFormatInput.validateInput(positionIndexes));
        if (FileFormatter.isEditing(this.props.row)) {
            return validationError;
        }
        return (isEmpty(channels) && isEmpty(positionIndexes) && isEmpty(scenes) && isEmpty(subImageNames)) ||
            validationError;
    }
}

export default FileFormatter;
