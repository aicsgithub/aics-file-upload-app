import { Alert, Icon, Modal, Select, Tooltip } from "antd";
import { isEmpty, isNil } from "lodash";
import { basename } from "path";
import * as React from "react";

import { Channel } from "../../../state/metadata/types";

import LabeledInput from "../../LabeledInput";
import PrinterFormatInput from "../../PrinterFormatInput";
import { FormatterProps } from "../index";

const styles = require("./styles.pcss");

interface Props extends FormatterProps {
    addScenes: (positionIndexes: number[], channels: Channel[]) => void;
    channelOptions: Channel[];
}

interface FileFormatterState {
    errorMessage?: string;
    isEditing: boolean;
    showModal: boolean;
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
            .filter((c?: Channel) => !!c) as Channel[];
    }

    private static convertPositionIndexes(positionIndexes: number[] = []): string {
        return positionIndexes ? positionIndexes.join(", ") : "";
    }

    constructor(props: Props) {
        super(props);
        const { channelOptions, row: { channelIds, positionIndexes } } = props;
        const channels =  FileFormatter.convertChannels(channelIds, channelOptions);
        this.state = {
            channels,
            isEditing: !isEmpty(channelIds) || !isEmpty(positionIndexes),
            positionIndexes: FileFormatter.convertPositionIndexes(positionIndexes),
            showModal: false,
        };
    }

    public componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<FileFormatterState>): void {
        if (prevState.showModal !== this.state.showModal && this.state.showModal) {
            const {channelOptions, row: {channelIds, positionIndexes}} = this.props;
            const channels =  FileFormatter.convertChannels(channelIds, channelOptions);
            this.setState({ channels, positionIndexes: FileFormatter.convertPositionIndexes(positionIndexes) });
        }
    }

    public render() {
        const {
            channelOptions,
            row,
            value,
        } = this.props;
        const {
            channels,
            errorMessage,
            isEditing,
            positionIndexes,
            showModal,
        } = this.state;

        if (row.channel) {
            let content = row.channel.name;
            if (isNil(row.positionIndex)) {
                content += " (all positions)";
            }

            return (
                <div className={styles.container}>
                    {content}
                </div>
            );
        }

        if (!isNil(row.positionIndex)) {
            return (
                <div className={styles.container}>
                    Position {row.positionIndex}
                </div>
            );
        }

        const fileName = basename(value);
        const action = isEditing ? "Update" : "Add";
        const title = `${action} Scenes and channels for "${fileName}"`;

        return (
            <div>
                <Tooltip title={value} className={styles.fileCell}>
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
                    onOk={this.addSceneAndChannels}
                    onCancel={this.closeModal}
                    okText={action}
                    okButtonProps={{disabled: this.getOkButtonDisabled()}}
                >
                    <p className={styles.modalHelpText}>
                        If this is a microscopy image (3i, czi, ome.tiff) you can add scene positions or channels.
                        This will allow you to add annotations for specific scenes and channels within a file.
                    </p>
                    <Alert
                        className={styles.alert}
                        type="warning"
                        showIcon={true}
                        closable={true}
                        message="Adding scenes will clear out direct file-well associations made on the previous page"
                    />
                    <LabeledInput label="Scene Positions (ex. 1, 4, 5-10)">
                        <PrinterFormatInput
                            value={positionIndexes}
                            onEnter={this.enterScenes}
                            placeholder="Enter Scene Positions"
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
                            {channelOptions.map((channel: Channel) => (
                                <Select.Option key={channel.name} value={channel.name}>
                                    {channel.name}({channel.description})
                                </Select.Option>
                            ))}
                        </Select>
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

    private addSceneAndChannels = () => {
        const { channels, positionIndexes } = this.state;
        const scenes = PrinterFormatInput.extractValues(positionIndexes);
        this.props.addScenes(scenes || [], channels);
        this.setState({ showModal: false, isEditing: !isEmpty(scenes) || !isEmpty(channels) });
    }

    private selectChannel = (names: string[]) => {
        const channels = this.props.channelOptions.filter((channel) => names.includes(channel.name));
        this.setState({ channels });
    }

    private enterScenes = (positionIndexes: string, errorMessage: string | undefined) => {
        this.setState({ positionIndexes, errorMessage });
    }

    private getOkButtonDisabled = (): boolean => {
        const { channels, isEditing, positionIndexes } = this.state;
        const validationError: boolean = Boolean(PrinterFormatInput.validateInput(positionIndexes));
        if (isEditing) {
            return validationError;
        }
        return (isEmpty(channels) && isEmpty(positionIndexes)) || validationError;
    }

}

export default FileFormatter;
