import { Select } from "antd";
import React, { useState } from "react";

const styles = require("./styles.pcss");

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

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleCommit();
    }
  }

  return (
    <Select
      autoFocus
      allowClear
      defaultOpen
      className={styles.defaultInput}
      mode="multiple"
      onBlur={handleCommit}
      onInputKeyDown={onKeyDown}
      onChange={(v: string[]) => setValue(v)}
      value={value}
    >
      {options.map((option: string) => (
        <Select.Option key={option}>{option}</Select.Option>
      ))}
    </Select>
  );
}
