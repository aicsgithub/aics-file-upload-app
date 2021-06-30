import { Spin } from "antd";
import * as React from "react";
import {
  Column,
  FilterValue,
  Row,
  TableInstance,
  useBlockLayout,
  useFilters,
  useResizeColumns,
  useRowSelect,
  useSortBy,
  useTable,
} from "react-table";

import StatusCircle from "../../../components/StatusCircle";
import { JOB_STATUSES } from "../../../services/job-status-client/types";
import { UploadSummaryTableRow } from "../../../state/types";
import Table from "../../Table";
import SelectionCell from "../../Table/CustomCells/SelectionCell";
import ReadOnlyCell from "../../Table/DefaultCells/ReadOnlyCell";
import DefaultHeader from "../../Table/Headers/DefaultHeader";
import SelectionHeader from "../../Table/Headers/SelectionHeader";

import Filter, { FilterType } from "./Filter";

const styles = require("./styles.pcss");

interface Props {
  title: string;
  isLoading: boolean;
  onContextMenu: () => void;
  uploads: UploadSummaryTableRow[];
  setSelectedUploadKeys: (selectedUploadKeys: string[]) => void;
}

const COLUMNS: Column<UploadSummaryTableRow>[] = [
  {
    id: "selection",
    disableResizing: true,
    Header: SelectionHeader,
    Cell: SelectionCell,
    maxWidth: 35,
  },
  {
    accessor: "status",
    Cell: StatusCircle,
    description: "Status of the upload",
    filter: FilterType.SELECTION,
    Filter: Filter({ type: FilterType.SELECTION, options: JOB_STATUSES }),
    id: "Status",
    width: 85,
  },
  {
    accessor: "jobName",
    description: "Name of the file uploaded",
    Filter: Filter({ type: FilterType.TEXT }),
    id: "File Name",
    width: 350,
  },
  {
    accessor: "created",
    Cell: (props) => (
      <ReadOnlyCell
        {...props}
        value={props.value.toLocaleString(undefined, {
          timeZone: "America/Los_Angeles",
        })}
      />
    ),
    description: "Time the file upload began",
    Filter: Filter({ type: FilterType.DATE }),
    filter: FilterType.DATE,
    id: "Created",
  },
  {
    accessor: "fileId",
    description: "Unique FMS ID assigned to the uploaded file",
    Filter: Filter({ type: FilterType.TEXT }),
    id: "File ID",
  },
  {
    accessor: "filePath",
    description: "Unique FMS File Path assigned to the uploaded file",
    Filter: Filter({ type: FilterType.TEXT }),
    id: "FMS File Path",
  },
];

// Custom filtering methods for react-table
const FILTER_TYPES: Record<string, FilterValue> = {
  [FilterType.DATE]: (
    rows: Row<UploadSummaryTableRow>[],
    _: "created",
    filterValue: FilterValue
  ) =>
    rows.filter(
      (row) =>
        row.original["created"].getDate() === filterValue.getDate() &&
        row.original["created"].getMonth() === filterValue.getMonth() &&
        row.original["created"].getFullYear() === filterValue.getFullYear()
    ),
  [FilterType.SELECTION]: (
    rows: Row<UploadSummaryTableRow>[],
    _: "status",
    filterValue: FilterValue
  ) => rows.filter((row) => filterValue.includes(row.original["status"])),
};

export default function UploadTable(props: Props) {
  const data = React.useMemo(() => props.uploads, [props.uploads]);
  const columns = React.useMemo(() => COLUMNS, [COLUMNS]);

  const tableInstance: TableInstance<UploadSummaryTableRow> = useTable<
    UploadSummaryTableRow
  >(
    {
      columns,
      data,
      // Defines the default column properties, can be overriden per column
      defaultColumn: {
        Cell: ReadOnlyCell,
        Header: DefaultHeader,
        minWidth: 30,
        width: 200,
        maxWidth: 1000,
      },
      getRowId: (row) => row.jobId,
      // Similarly to the above property this comes from a plugin, useSortBy,
      // and prevents sorting from reseting after data is modified
      autoResetSortBy: false,
      // Similarly to the above property this comes from a plugin, useFilters,
      // and prevents filtering from reseting after data is modified
      autoResetFilters: false,
      filterTypes: FILTER_TYPES,
    },
    // optional plugins
    useFilters,
    useSortBy,
    useRowSelect,
    useBlockLayout, // Makes element widths adjustable
    useResizeColumns
  );

  return (
    <div>
      <h3 className={styles.tableTitle}>{props.title}</h3>
      {props.isLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      ) : (
        <Table className={styles.tableContainer} tableInstance={tableInstance} />
      )}
    </div>
  );
}
