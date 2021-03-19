import { basename } from "path";

import { Alert, Modal, Select } from "antd";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { getChannels } from "../../state/metadata/selectors";
import { closeSubFileSelectionModal } from "../../state/selection/actions";
import { getSubFileSelectionModalFile } from "../../state/selection/selectors";
import { getUploadFileNames } from "../../state/upload/selectors";
import LabeledInput from "../LabeledInput";

import SubImageInput, { SubImageType } from "./SubImageInput";

const styles = require("./styles.pcss");

function SubFileSelectionModal({ file }: { file: string }) {
  const dispatch = useDispatch();
  const fileOptions = useSelector(getUploadFileNames);
  const channelOptions = useSelector(getChannels);
  // TODO: Need to get the dimension info for the file as is to initialize these

  const [files, setFiles] = React.useState<string[]>([]);
  const [channelIds, setChannelIds] = React.useState<string[]>([]);
  const [positionIndexes, setPositionIndexes] = React.useState<string>("");
  const [scenes, setScenes] = React.useState<string>("");
  const [subImageNames, setSubImageNames] = React.useState<string[]>([]);
  const [subImageType, setSubImageType] = React.useState<SubImageType>(
    SubImageType.SCENE
  );
  const [error, setError] = React.useState<string>();

  const fileName = basename(file);

  function onSubmit() {
    // dispatch(addScenes(
    //   files,
    //   PrinterFormatInput.extractValues(positionIndexes) || [],
    //   channelIds,
    //   PrinterFormatInput.extractValues(scenes) || [],
    //   subImageNames
    // ));
  }
  const canSubmit = false;

  return (
    <Modal
      visible
      width="50%"
      title={`Adjust scenes, positions, & channels for ${fileName}`}
      onOk={onSubmit}
      onCancel={() => dispatch(closeSubFileSelectionModal())}
      okButtonProps={{ disabled: !canSubmit }}
    >
      <p className={styles.modalHelpText}>
        If this is a microscopy image (3i, czi, ome.tiff, lif) you can add
        scenes, positions, sub images or channels. This will allow you to add
        annotations for specific scenes and channels within a file.
      </p>
      <Alert
        className={styles.alert}
        type="warning"
        showIcon={true}
        closable={true}
        message="Adding scenes, positions, or sub image names will clear out direct file-well associations made on the previous page"
      />
      {files.length > 1 && (
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
          onChange={setFiles}
          placeholder="Select Files"
          mode="tags"
          value={files}
        >
          {fileOptions.split(", ").map((file: string) => (
            <Select.Option key={file} value={file}>
              {file}
            </Select.Option>
          ))}
        </Select>
      </LabeledInput>
      <SubImageInput
        onValidationError={setError}
        positionIndexes={positionIndexes}
        subImageNames={subImageNames}
        scenes={scenes}
        subImageType={subImageType}
        setPositionIndexes={setPositionIndexes}
        setSubImageNames={setSubImageNames}
        setScenes={setScenes}
        setSubImageType={setSubImageType}
      />
      <LabeledInput label="Channels">
        <Select
          className={styles.input}
          allowClear={true}
          onChange={setChannelIds}
          placeholder="Select Channels"
          mode="tags"
          value={channelIds}
        >
          {channelOptions.map(({ channelId }) => (
            <Select.Option key={channelId} value={channelId}>
              {channelId}
            </Select.Option>
          ))}
        </Select>
      </LabeledInput>
      {error && (
        <Alert
          className={styles.alert}
          type="error"
          showIcon={true}
          message={error}
        />
      )}
    </Modal>
  );
}

// Wrap SubFileSelectionModal so that it recreates on every
// file prop change rather than re-render
export default function SubFileSelectionModalWrapper() {
  const file = useSelector(getSubFileSelectionModalFile);
  if (!file) {
    return null;
  }
  return <SubFileSelectionModal file={file} />;
}
