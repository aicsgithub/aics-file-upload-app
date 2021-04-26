import React, { useState } from "react";

import { MetadataStateBranch } from "../../../../state/types";
import LookupSearch from "../../../LookupSearch";
import { createEnterKeyHandler } from "../util";

const styles = require("../defaultInputStyles.pcss");

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

  return (
    <div onKeyDown={createEnterKeyHandler(handleCommit)}>
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
