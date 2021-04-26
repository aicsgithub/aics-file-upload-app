import { Input } from "antd";
import React, { useState } from "react";

import { createEnterKeyHandler } from "../util";

const styles = require("../defaultInputStyles.pcss");

interface Props {
  initialValue: string[];
  commitChanges: (value: string[]) => void;
}

export default function TextEditor({ initialValue, commitChanges }: Props) {
  const [value, setValue] = useState<string>(initialValue.join(", "));

  function handleCommit() {
    commitChanges(value.split(",").map((v) => v.trim()));
  }

  return (
    <Input
      autoFocus
      className={styles.defaultInput}
      onBlur={handleCommit}
      onKeyDown={createEnterKeyHandler(handleCommit)}
      onChange={(e) => setValue(e.target.value)}
      value={value}
    />
  );
}
