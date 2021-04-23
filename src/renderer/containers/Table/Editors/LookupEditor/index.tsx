import React, { useState } from "react";

import { MetadataStateBranch } from "../../../../state/types";
import LookupSearch from "../../../LookupSearch";

const styles = require("../defaultInputStyles.pcss.pcss");

interface Props {
  initialValue: string[];
  lookupAnnotationName: keyof MetadataStateBranch;
  commitChanges: (value: string[]) => void;
}

export default function LookupEditor({
  initialValue,
  lookupAnnotationName,
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
    <div onKeyDown={onKeyDown}>
      <LookupSearch
        defaultOpen
        className={styles.defaultInput}
        onBlur={handleCommit}
        mode="multiple"
        lookupAnnotationName={lookupAnnotationName}
        selectSearchValue={setValue}
        value={value}
      />
    </div>
  );
}
