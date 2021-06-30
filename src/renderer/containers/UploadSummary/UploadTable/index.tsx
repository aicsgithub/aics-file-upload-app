import { Button, DatePicker, Input, Table, Tooltip } from "antd";
import { ColumnProps } from "antd/lib/table";
import * as React from "react";

import StatusCircle from "../../../components/StatusCircle";
import {
  JOB_STATUSES,
  JSSJobStatus,
} from "../../../services/job-status-client/types";
import { UploadSummaryTableRow } from "../../../state/types";

import UploadProgress from "../UploadProgress";
import ResizeableHeader from "./ResizeableHeader";

const styles = require("./styles.pcss");

interface Props {
  title: string;
  isLoading: boolean;
  onContextMenu: () => void;
  uploads: UploadSummaryTableRow[];
  setSelectedUploadKeys: (selectedUploadKeys: string[]) => void;
}

const COLUMNS: ColumnProps<UploadSummaryTableRow>[] = [
  {
    align: "center",
    dataIndex: "status",
    filterMultiple: true,
    filters: JOB_STATUSES.map((s) => ({
      text: s,
      value: s,
    })),
    onFilter: (value, record) => record.status === value,
    render: function render(status: JSSJobStatus) {
      return <StatusCircle status={status} />;
    },
    sorter: (a, b) => a.status.localeCompare(b.status),
    title: "Status",
    width: 115,
  },
  {
    dataIndex: "jobName",
    ellipsis: true,
    onFilter: (value, record) => record.jobName?.includes(value) || false,
    filters: [],
    filterDropdown: (props) => {
      function onSubmit(e: any) {
        e.preventDefault();
        props.setSelectedKeys?.([e.target.firstChild.value]);
        props.confirm?.();
      }
      return (
        <form onSubmit={onSubmit}>
          <Input placeholder="Filter File Names" />
          <div className={styles.filterButtonBar}>
            <button type="submit">OK</button>
            <button onClick={() => props.clearFilters?.()}>Reset</button>
          </div>
        </form>
      );
    },
    render: function render(filename: string, row: UploadSummaryTableRow) {
      return (
        <Tooltip overlay={filename} mouseLeaveDelay={0} placement="leftTop">
          {filename}
          <UploadProgress row={row} />
        </Tooltip>
      );
    },
    sorter: (a, b) => a.jobName?.localeCompare(b?.jobName || "") || 1,
    title: "File Name",
    width: "100%",
  },
  {
    dataIndex: "created",
    // sorter: (a, b) => a.created.getMilliseconds() - b.created.getMilliseconds(),
    // onFilter: (value, record) => {
    //   const valueAsDate = new Date(value);
    //   return (
    //     valueAsDate.getFullYear() === record.created.getFullYear() &&
    //     valueAsDate.getMonth() === record.created.getMonth() &&
    //     valueAsDate.getDate() === record.created.getDate()
    //   );
    // },
    // filters: [],
    render: (created: Date) =>
      created.toLocaleString(undefined, { timeZone: "America/Los_Angeles" }),
    title: "Created",
    // filterDropdown: (props) => (
    //   <DatePicker
    //     onChange={(v) => {
    //       props.setSelectedKeys?.(v ? [v?.toLocaleString()] : []);
    //       props.confirm?.();
    //     }}
    //   />
    // ),
    width: 235,
  },
  {
    dataIndex: "fileIds",
    filters: [],
    filterDropdown: (props) => {
      function onSubmit(e: any) {
        e.preventDefault();
        props.setSelectedKeys?.([e.target.firstChild.value]);
        props.confirm?.();
      }
      return (
        <form onSubmit={onSubmit}>
          <Input placeholder="Filter File IDs" />
          <div className={styles.filterButtonBar}>
            <button type="submit">OK</button>
            <button onClick={() => props.clearFilters?.()}>Reset</button>
          </div>
        </form>
      );
    },
    onFilter: (value, record) =>
      record.fileIds?.some((id) => id.includes(value)) || false,
    render: (fileIds: string[]) =>
      fileIds ? (
        <div>
          <Tooltip overlay={fileIds.join(", ")} mouseLeaveDelay={0} placement="leftTop">
            {`${fileIds.join(", ").substring(0, 10)}...`}
          </Tooltip>
          <Tooltip overlay="Copy to Clipboard" mouseLeaveDelay={0}>
            <Button
              icon="copy"
              // TODO
              onClick={() => console.log("copy to clipboard")}
              type="link"
            />
          </Tooltip>
        </div>
      ) : undefined,
    sorter: (a, b) => a.fileIds?.[0].localeCompare(b.fileIds?.[0] || "") || 1,
    title: "File ID",
    width: 200,
  },
  {
    dataIndex: "filePaths",
    filters: [],
    filterDropdown: (props) => {
      function onSubmit(e: any) {
        e.preventDefault();
        props.setSelectedKeys?.([e.target.firstChild.value]);
        props.confirm?.();
      }
      return (
        <form onSubmit={onSubmit}>
          <Input placeholder="Filter File Paths" />
          <div className={styles.filterButtonBar}>
            <button type="submit">OK</button>
            <button onClick={() => props.clearFilters?.()}>Reset</button>
          </div>
        </form>
      );
    },
    render: (filePaths: string[]) =>
      filePaths ? (
        <div>
          <Tooltip overlay={filePaths.join(", ")} mouseLeaveDelay={0} placement="leftTop">
            {`${filePaths.join(", ").substring(0, 10)}...`}
          </Tooltip>
          <Tooltip overlay="Copy to Clipboard" mouseLeaveDelay={0}>
            <Button
              icon="copy"
              // TODO
              onClick={() => console.log("copy to clipboard")}
              type="link"
            />
          </Tooltip>
        </div>
      ) : undefined,
    onFilter: (value, record) =>
      record.filePaths?.some((p) => p.includes(value)),
    sorter: (a, b) =>
      a.filePaths?.[0].localeCompare(b.filePaths?.[0] || "") || 1,
    title: "FMS File Path",
    width: 200,
  },
];

export default function UploadTable(props: Props) {
  const [columns, setColumns] = React.useState(COLUMNS);

  function handleResize(index: number) {
    return (_: any, { size }: { size: { width: number } }) => {
      console.log("resizing", index, size);
      const nextColumns = [...columns];
      nextColumns[index] = {
        ...nextColumns[index],
        width: size.width
      }
      setColumns(nextColumns);
    }
  };

  const columnsWithResizeEvent: ColumnProps<UploadSummaryTableRow>[] = columns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

  return (
    <Table
      className={styles.table}
      components={{
        header: {
          cell: ResizeableHeader,
        },
      }}
      loading={props.isLoading}
      columns={columnsWithResizeEvent}
      title={() => props.title}
      dataSource={props.uploads}
      size="small"
      pagination={false}
      onRow={() => ({
        onContextMenu: props.onContextMenu,
      })}
      rowSelection={{
        onChange: (selectedUploadKeys) => {
          props.setSelectedUploadKeys(selectedUploadKeys as string[]);
        },
      }}
      // Unforunately this is the only way to convince the table
      // to confine its height
      scroll={{ y: "calc(50vh - 170px)", x: 700 }}
    />
  );
}
