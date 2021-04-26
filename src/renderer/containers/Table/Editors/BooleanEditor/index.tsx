import { Checkbox } from "antd";
import React, { useState } from "react";

import { createEnterKeyHandler } from "../util";

const styles = require("./styles.pcss");

interface Props {
  initialValue: boolean[];
  commitChanges: (value: boolean[]) => void;
}

export default function BooleanEditor({ initialValue, commitChanges }: Props) {
  const [value, setValue] = useState<boolean>(initialValue[0] ?? false);

  function handleCommit() {
    commitChanges([value]);
  }

  return (
    <div
      className={styles.checkboxContainer}
      onBlur={handleCommit}
      onKeyDown={createEnterKeyHandler(handleCommit)}
    >
      <Checkbox
        autoFocus
        checked={value}
        onChange={() => setValue((prev) => !prev)}
      />
    </div>
  );
}
