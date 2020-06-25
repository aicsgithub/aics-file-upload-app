import { basename } from "path";

import { Alert, Icon, Modal, Radio, Select, Tooltip } from "antd";
import { RadioChangeEvent } from "antd/es/radio";
import { isEmpty, isNil, uniq } from "lodash";
import { ReactNode } from "react";
import * as React from "react";

import { CHANNEL_ANNOTATION_NAME } from "../../../constants";
import { Channel } from "../../../state/metadata/types";
import { UploadJobTableRow } from "../../../state/upload/types";
import LabeledInput from "../../LabeledInput";
import PrinterFormatInput from "../../PrinterFormatInput";
import { FormatterProps } from "../index";

const styles = require("./styles.pcss");

interface Props extends FormatterProps<UploadJobTableRow> {
  addScenes: (
    files: string[],
    positionIndexes: number[],
    channelIds: string[],
    scenes: number[],
    subImageNames: string[]
  ) => void;
  channelOptions: Channel[];
  fileOptions: string[];
}

type subImage = "name" | "position" | "scene";

interface FileFormatterState {
  errorMessage?: string;
  files: string[];
  scenes: string;
  showModal: boolean;
  subImageNames: string[];
  subImageType: subImage;
  positionIndexes: string;
  channelIds: string[];
}

/**
 * This is used in the custom data grid. It displays a file path within a grid cell and provides a button that
 * opens a modal to add scenes and channels to the file.
 */
class FileFormatter extends React.Component<Props, FileFormatterState> {
  private static convertListToString(
    positionIndexes: Array<number | string> = []
  ): string {
    return positionIndexes ? positionIndexes.join(", ") : "";
  }

  private static isEditing({
    channelIds,
    positionIndexes,
    scenes,
    subImageNames,
  }: UploadJobTableRow): boolean {
    return (
      !isEmpty(channelIds) ||
      !isEmpty(positionIndexes) ||
      !isEmpty(scenes) ||
      !isEmpty(subImageNames)
    );
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      ...this.getInitialState(),
      showModal: false,
    };
  }

  public render() {
    const { channelOptions, fileOptions, row, value } = this.props;
    const { channelIds, files, errorMessage, showModal } = this.state;
    let subImageValue;
    let subImageType;
    if (!isNil(row.positionIndex)) {
      subImageValue = row.positionIndex;
      subImageType = "Position";
    } else if (!isNil(row.scene)) {
      subImageValue = row.scene;
      subImageType = "Scene";
    } else if (!isNil(row.subImageName)) {
      subImageValue = row.subImageName;
      subImageType = "";
    }

    if (row.channelId) {
      const channelName = row.channelId;
      const content = isNil(subImageValue)
        ? `${channelName} (all positions)`
        : `${subImageType} ${subImageValue}, ${channelName}`;
      return (
        <Tooltip mouseLeaveDelay={0} title={value} className={styles.container}>
          {content}
        </Tooltip>
      );
    }

    if (subImageValue) {
      return (
        <Tooltip mouseLeaveDelay={0} title={value} className={styles.container}>
          {subImageType} {subImageValue}
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
          okButtonProps={{ disabled: this.getOkButtonDisabled() }}
        >
          <p className={styles.modalHelpText}>
            If this is a microscopy image (3i, czi, ome.tiff, lif) you can add
            scenes, positions, sub images or channels. This will allow you to
            add annotations for specific scenes and channels within a file.
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
          {this.renderSubImageInputs()}
          <LabeledInput label="Channels">
            <Select
              className={styles.input}
              allowClear={true}
              onChange={this.selectChannel}
              placeholder="Select Channels"
              mode="tags"
              value={channelIds}
            >
              {channelOptions.map(({ channelId }: Channel) => (
                <Select.Option key={channelId} value={channelId}>
                  {channelId}
                </Select.Option>
              ))}
            </Select>
          </LabeledInput>
          {errorMessage && (
            <Alert
              className={styles.alert}
              type="error"
              showIcon={true}
              message={errorMessage}
            />
          )}
        </Modal>
      </div>
    );
  }

  private renderSubImageInputs = () => {
    const { positionIndexes, scenes, subImageNames, subImageType } = this.state;
    let input: ReactNode;
    let label: string;
    switch (subImageType) {
      case "name":
        input = (
          <Select
            className={styles.input}
            mode="tags"
            onChange={this.setSubImageNames}
            placeholder="Sub Image Names"
            value={subImageNames}
          />
        );
        label = "Sub Image Names";
        break;
      case "position":
        input = (
          <PrinterFormatInput
            value={positionIndexes}
            onEnter={this.enterPositionIndexes}
            placeholder="Enter Positions"
          />
        );
        label = "Positions (ex. 1, 4, 5-10)";
        break;
      default:
        input = (
          <PrinterFormatInput
            value={scenes}
            onEnter={this.enterScenes}
            placeholder="Enter Scenes"
          />
        );
        label = "Scenes (ex. 1, 4, 5-10)";
        break;
    }
    return (
      <div className={styles.subImageGroup}>
        <LabeledInput label="Sub Image Type" className={styles.subImageType}>
          <Radio.Group onChange={this.selectSubImageType} value={subImageType}>
            <Radio.Button value="position">Position</Radio.Button>
            <Radio.Button value="scene">Scene</Radio.Button>
            <Radio.Button value="name">Name</Radio.Button>
          </Radio.Group>
        </LabeledInput>
        <LabeledInput label={label} className={styles.subImageInput}>
          {input}
        </LabeledInput>
      </div>
    );
  };

  private openModal = () => this.setState({ showModal: true });

  private closeModal = () =>
    this.setState({
      showModal: false,
    });

  private getInitialState = () => {
    const {
      row: { file, positionIndexes, scenes, subImageNames },
    } = this.props;
    const channelIds = this.props.row[CHANNEL_ANNOTATION_NAME];
    let subImageType: subImage = "position";
    if (!isEmpty(scenes)) {
      subImageType = "scene";
    } else if (!isEmpty(subImageNames)) {
      subImageType = "name";
    }
    return {
      channelIds,
      files: [file],
      positionIndexes: FileFormatter.convertListToString(positionIndexes),
      scenes: FileFormatter.convertListToString(scenes),
      subImageNames,
      subImageType,
    };
  };

  private addFilesScenesAndChannels = () => {
    const {
      channelIds,
      files,
      positionIndexes,
      scenes,
      subImageNames,
    } = this.state;
    this.props.addScenes(
      files,
      PrinterFormatInput.extractValues(positionIndexes) || [],
      channelIds,
      PrinterFormatInput.extractValues(scenes) || [],
      subImageNames
    );
    this.setState({ showModal: false });
  };

  private selectFiles = (selectedFiles: string[]) => {
    const {
      fileOptions,
      row: { file },
    } = this.props;
    const files = selectedFiles.filter((selectedFile) =>
      fileOptions.includes(selectedFile)
    );
    this.setState({ files: uniq([file, ...files]) });
  };

  private selectChannel = (channelIds: string[]) => {
    this.setState({ channelIds });
  };

  private selectSubImageType = (e: RadioChangeEvent) =>
    this.setState({ subImageType: e.target.value });

  private enterScenes = (scenes: string, errorMessage?: string) => {
    this.setState({
      positionIndexes: "",
      scenes,
      subImageNames: [],
      errorMessage,
    });
  };

  private enterPositionIndexes = (
    positionIndexes: string,
    errorMessage?: string
  ) => {
    this.setState({
      positionIndexes,
      scenes: "",
      subImageNames: [],
      errorMessage,
    });
  };

  private setSubImageNames = (subImageNames: string[]) => {
    this.setState({ positionIndexes: "", scenes: "", subImageNames });
  };

  private getOkButtonDisabled = (): boolean => {
    const { channelIds, positionIndexes, scenes, subImageNames } = this.state;
    const validationError = Boolean(
      PrinterFormatInput.validateInput(positionIndexes)
    );
    if (FileFormatter.isEditing(this.props.row)) {
      return validationError;
    }
    return (
      (isEmpty(channelIds) &&
        isEmpty(positionIndexes) &&
        isEmpty(scenes) &&
        isEmpty(subImageNames)) ||
      validationError
    );
  };
}

export default FileFormatter;
