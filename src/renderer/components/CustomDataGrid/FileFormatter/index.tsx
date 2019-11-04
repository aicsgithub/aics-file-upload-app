import { Alert, Icon, Modal, Select, Tooltip } from "antd";
import { isEmpty, isNil, isNumber } from "lodash";
import { basename } from "path";
import * as React from "react";

import { Channel } from "../../../state/metadata/types";

import LabeledInput from "../../LabeledInput";
import { FormatterProps } from "../index";

const styles = require("./styles.pcss");

interface Props extends FormatterProps {
    addScenes: (positionIndexes: number[], channels: Channel[]) => void;
    channelOptions: Channel[];
}

interface FileFormatterState {
    isEditing: boolean;
    showModal: boolean;
    positionIndexes: number[];
    channels: Channel[];
}

/**
 * This is used in the custom data grid. It displays a file path within a grid cell and provides a button that
 * opens a modal to add scenes and channels to the file.
 */
class FileFormatter extends React.Component<Props, FileFormatterState> {

    constructor(props: Props) {
        super(props);
        const channels =  (props.row.channelIds ? props.row.channelIds
            .map((id: number) => props.channelOptions.find((o) => o.channelId === id))
            .filter((c?: Channel) => !!c) : []) as Channel[];
        this.state = {
            channels,
            isEditing: !isEmpty(props.row.channelIds) || !isEmpty(props.row.positionIndexes),
            positionIndexes: props.row.positionIndexes ? [...props.row.positionIndexes] : [],
            showModal: false,
        };
    }

    public componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<FileFormatterState>): void {
        if (prevState.showModal !== this.state.showModal && this.state.showModal) {
            const {channelOptions, row: {channelIds, positionIndexes}} = this.props;
            const channels =  (channelIds ? channelIds
                .map((id: number) => channelOptions.find((o: Channel) => o.channelId === id))
                .filter((c?: Channel) => !!c) : []) as Channel[];
            this.setState({
                channels,
                isEditing: !isEmpty(channelIds) || !isEmpty(positionIndexes),
                positionIndexes: positionIndexes ? [...positionIndexes] : [],
            });
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
        const title = isEditing ? `Edit Scenes and channels for \"${fileName}\"` :
            `Add Scenes and channels to \"${fileName}\"`;

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
                    onOk={this.addScenes}
                    onCancel={this.closeModal}
                    okText={isEditing ? "Update" : "Add"}
                    okButtonProps={{disabled: this.getOkButtonDisabled()}}
                >
                    <div className={styles.modalHelpText}>
                        If this is a microscopy image (3i, czi, ome.tiff) you can add scene positions or channels.
                        This will allow you to add annotations for specific scenes and channels within a file.
                    </div>
                    {!isEditing && <Alert
                        message="Adding scenes will clear out direct file-well associations made on the previous page"
                        type="warning"
                        showIcon={true}
                        className={styles.alert}
                    />}
                    <LabeledInput label="Scene Position(s) (Non-negative Numbers Only)">
                        <Select
                            className={styles.input}
                            allowClear={true}
                            onChange={this.selectScene}
                            placeholder="Enter Scene Position(s)"
                            mode="tags"
                            value={positionIndexes}
                        />
                    </LabeledInput>
                    <LabeledInput label="Channel(s)">
                        <Select
                            className={styles.input}
                            allowClear={true}
                            onChange={this.selectChannel}
                            placeholder="Select Channel(s)"
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
                </Modal>
            </div>
        );
    }

    private openModal = () => this.setState({showModal: true});

    private closeModal = () => this.setState({
        showModal: false,
    })

    private addScenes = () => {
        const { channels, positionIndexes } = this.state;
        this.props.addScenes(positionIndexes, channels);
        this.setState({
            isEditing: !isEmpty(channels) || !isEmpty(positionIndexes),
            showModal: false,
        });
    }

    private selectChannel = (names: string[]) => {
        const channels = this.props.channelOptions.filter((channel) => names.includes(channel.name));
        this.setState({channels});
    }

    private selectScene = (positionIndexes: Array<number | string>) => {
        this.setState({
            positionIndexes: positionIndexes
                .map((pi: number | string) => parseInt(`${pi}`, 10))
                .filter((pi: number) => isNumber(pi) && pi > -1)});
    }

    private getOkButtonDisabled = () => {
        const { channels, isEditing, positionIndexes } = this.state;
        return !isEditing && isEmpty(positionIndexes) && isEmpty(channels);
    }
}

export default FileFormatter;
