import { DatePicker } from "antd";
import moment from "moment";
import React, { useState } from "react";
import { ColumnInstance } from "react-table";

import { DATE_FORMAT, DATETIME_FORMAT } from "../../../../constants";
import { ColumnType } from "../../../../services/labkey-client/types";
import { UploadJobTableRow } from "../../../../state/upload/types";

const styles = require("./styles.pcss");

interface Props {
  initialValue: Date[];
  column: ColumnInstance<UploadJobTableRow>;
  commitChanges: (value: Date[]) => void;
}

export default function DateEditor({
  initialValue,
  column,
  commitChanges,
}: Props) {
  const [value, setValue] = useState<(Date | null)[]>(
    initialValue.length > 0 ? initialValue : [null]
  );

  function handleCommit() {
    commitChanges(value.filter((v) => v instanceof Date) as Date[]);
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    // Only commit if navigating to the next cell and not clicking an
    // element in the Date window
    if (
      !(e.relatedTarget instanceof Element) ||
      (e.relatedTarget.className !== "ant-calendar-date-panel" &&
        (e.relatedTarget.tagName !== "LI" ||
          e.relatedTarget.attributes.getNamedItem("role")?.value !== "button"))
    ) {
      handleCommit();
    }
  }

  return (
    <div onBlur={handleBlur}>
      <DatePicker
        open
        autoFocus
        allowClear={false}
        onOk={handleCommit}
        className={styles.datePicker}
        showTime={column.type === ColumnType.DATETIME}
        placeholder="Add a Date"
        value={value[0] ? moment(value[0]) : undefined}
        onChange={(d) => setValue([d?.toDate() ?? null])}
        format={
          column.type === ColumnType.DATETIME ? DATETIME_FORMAT : DATE_FORMAT
        }
      />
    </div>
  );
}
