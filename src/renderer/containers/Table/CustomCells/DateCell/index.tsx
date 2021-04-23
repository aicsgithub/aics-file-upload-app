import { Button, DatePicker, Icon, Modal, Tooltip } from "antd";
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

export default function DateCell({
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

  return (
    <Modal
      visible
      okText="Save"
      onCancel={() => commitChanges(initialValue)}
      onOk={handleCommit}
      title={`Adjust ${column.id}`}
      width="50%"
    >
      {value.map((date, index) => (
        <div key={date?.toString() || ""} className={styles.dateInput}>
          <Tooltip title={date ? "Delete this date" : ""}>
            <Icon
              className={date ? undefined : styles.hidden}
              type="delete"
              onClick={() =>
                setValue((prev) => [
                  ...prev.slice(0, index),
                  ...prev.slice(index + 1),
                ])
              }
            />
          </Tooltip>
          <DatePicker
            autoFocus
            allowClear={false}
            className={styles.datePicker}
            showTime={column.type === ColumnType.DATETIME}
            placeholder="Add a Date"
            value={date ? moment(date) : undefined}
            onChange={(d) =>
              setValue((prev) => [
                ...prev.slice(0, index),
                d?.toDate() ?? null,
                ...prev.slice(index + 1),
              ])
            }
            format={
              column.type === ColumnType.DATETIME
                ? DATETIME_FORMAT
                : DATE_FORMAT
            }
          />
        </div>
      ))}
      <Button
        className={styles.datePlusButton}
        disabled={!(value?.length > 0) || !value[value.length - 1]}
        icon="plus"
        onClick={() => setValue((prev) => [...prev, null])}
      />
    </Modal>
  );
}
