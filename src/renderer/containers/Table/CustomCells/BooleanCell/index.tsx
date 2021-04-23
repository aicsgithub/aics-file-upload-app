import { Checkbox } from "antd";
import React, { useState } from "react";

const styles = require("./styles.pcss");

interface Props {
  initialValue: boolean[];
  commitChanges: (value: boolean[]) => void;
}

export default function BooleanCell({ initialValue, commitChanges }: Props) {
  const [value, setValue] = useState<boolean>(initialValue[0] ?? false);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      commitChanges([value]);
    }
  }

  return (
    <div
      className={styles.checkboxContainer}
      onBlur={() => commitChanges([value])}
      onKeyPress={onKeyDown}
    >
      <Checkbox
        autoFocus
        checked={value}
        onChange={() => setValue((prev) => !prev)}
      />
    </div>
  );
}
