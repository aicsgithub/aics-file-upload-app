import { Radio, Select } from "antd";
import { RadioChangeEvent } from "antd/lib/radio";
import React, { ReactNode } from "react";

import LabeledInput from "../../components/LabeledInput";
import PrinterFormatInput from "../../components/PrinterFormatInput";

const styles = require("./styles.pcss");

interface Props {
  onValidationError: (error: string) => void;
  positionIndexes: string;
  scenes: string;
  subImageNames: string[];
  subImageType: SubImageType;
  setPositionIndexes: (positionIndexes: string) => void;
  setScenes: (scenes: string) => void;
  setSubImageNames: (subImageNames: string[]) => void;
  setSubImageType: (type: SubImageType) => void;
}

export enum SubImageType {
  GENERIC = "name",
  POSITION = "position",
  SCENE = "scene",
}

export default function SubImageInput(props: Props) {
  function onPrinterInput(values: string, error?: string) {
    props.onValidationError(error || "");
    if (props.subImageType === SubImageType.POSITION) {
      props.setPositionIndexes(values);
    } else {
      props.setScenes(values);
    }
  }

  function onSubImageTypeChange(e: RadioChangeEvent) {
    // Reset old value for type before changing to new type
    if (props.subImageType === SubImageType.POSITION) {
      props.setPositionIndexes("");
    } else if (props.subImageType === SubImageType.SCENE) {
      props.setScenes("");
    } else {
      props.setSubImageNames([]);
    }
    props.setSubImageType(e.target.value);
  }

  let label: string;
  let input: ReactNode;
  switch (props.subImageType) {
    case SubImageType.GENERIC:
      input = (
        <Select
          className={styles.input}
          mode="tags"
          onChange={props.setSubImageNames}
          placeholder="Sub Image Names"
          value={props.subImageNames}
        />
      );
      label = "Sub Image Names";
      break;
    case SubImageType.POSITION:
      input = (
        <PrinterFormatInput
          value={props.positionIndexes}
          onEnter={onPrinterInput}
          placeholder="Enter Positions"
        />
      );
      label = "Positions (ex. 1, 4, 5-10)";
      break;
    default:
      input = (
        <PrinterFormatInput
          value={props.scenes}
          onEnter={onPrinterInput}
          placeholder="Enter Scenes"
        />
      );
      label = "Scenes (ex. 1, 4, 5-10)";
      break;
  }

  return (
    <div className={styles.subImageGroup}>
      <LabeledInput label="Sub Image Type" className={styles.subImageType}>
        <Radio.Group onChange={onSubImageTypeChange} value={props.subImageType}>
          <Radio.Button value={SubImageType.POSITION}>Position</Radio.Button>
          <Radio.Button value={SubImageType.SCENE}>Scene</Radio.Button>
          <Radio.Button value={SubImageType.GENERIC}>Name</Radio.Button>
        </Radio.Group>
      </LabeledInput>
      <LabeledInput label={label} className={styles.subImageInput}>
        {input}
      </LabeledInput>
    </div>
  );
}
