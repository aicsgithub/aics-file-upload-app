import { Select } from "antd";
import React, { useState } from "react";

import { createEnterKeyHandler } from "../util";

const styles = require("../defaultInputStyles.pcss");

interface Props {
  initialValue: string[];
  options: string[];
  commitChanges: (value: string[]) => void;
}

export default function DropdownEditor({
  initialValue,
  options,
  commitChanges,
}: Props) {
  const [value, setValue] = useState<string[]>(initialValue);

  function handleCommit() {
    commitChanges(value);
  }

  return (
    <Select
      autoFocus
      allowClear
      defaultOpen
      className={styles.defaultInput}
      mode="multiple"
      onBlur={handleCommit}
      onInputKeyDown={createEnterKeyHandler(handleCommit)}
      onChange={(v: string[]) => setValue(v)}
      value={value}
    >
      {options.map((option: string) => (
        <Select.Option key={option}>{option}</Select.Option>
      ))}
    </Select>
  );
}
