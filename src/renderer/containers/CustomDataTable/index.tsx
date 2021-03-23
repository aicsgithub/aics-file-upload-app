import React from "react";
import { useSelector } from "react-redux";
import {
  useTable,
  useExpanded,
  useRowSelect,
  useSortBy,
  useBlockLayout,
  useResizeColumns,
  TableInstance,
} from "react-table";

import SubFileSelectionModal from "../../components/SubFileSelectionModal.tsx";
import { getMassEditRow } from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getUploadRowKey } from "../../state/upload/constants";
import { getUploadAsTableRows } from "../../state/upload/selectors";
import MassEditTable from "../MassEditTable";

import { getColumnsForTable } from "./selectors";
import Table from "./Table";
import DefaultCell from "./Table/DefaultCells/DefaultCell";
import { CustomRow } from "./Table/DefaultCells/DisplayCell";
import DefaultHeader from "./Table/Headers/DefaultHeader";
import TableFooter from "./TableFooter";
import TableToolHeader from "./TableToolHeader";

interface Props {
  hasSubmitBeenAttempted: boolean;
}

// TODO: Try specifying generic type
interface CustomTable extends TableInstance<any> {
  selectedFlatRows?: CustomRow[];
}

/*
  This componenet is responsible for rendering the table users enter their
  custom data into. The majority of this component is ruled by the utility
  package "react-table." This works by supplying the row data & column
  definitions to react-table's "useTable" hook which then provides hooks
  to use to turn a display table into an interactive table with a lot
  of the logic like row selection managed for us. Majority of the logic
  can be found by finding the "Cell" component specified by the column.
*/
export default function CustomDataTable({ hasSubmitBeenAttempted }: Props) {
  const rows = useSelector(getUploadAsTableRows);
  const template = useSelector(getAppliedTemplate);
  const isMassEditing = useSelector(getMassEditRow);
  const columnDefinitions = useSelector(getColumnsForTable);

  const data = React.useMemo(() => rows, [rows]);
  const columns = React.useMemo(
    () =>
      columnDefinitions.map((column) => ({
        ...column,
        hasSubmitBeenAttempted,
      })),
    [columnDefinitions, hasSubmitBeenAttempted]
  );
  console.log("rows, data", rows, data);

  const tableInstance: CustomTable = useTable(
    {
      columns,
      getRowId: React.useMemo(() => getUploadRowKey, []),
      // Defines the default column properties, can be overriden per column
      defaultColumn: {
        Cell: DefaultCell,
        Header: DefaultHeader,
        minWidth: 30,
        width: 100,
        maxWidth: 500,
      },
      data,
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore: The react-table typing does not account for the hooks
      // provided by plugins as such this is not known by the typing though
      // is necessary to prevent expanded rows from collapsing on update
      // this comes from the useExpanded plugin - Sean M 03/23/21
      autoResetExpanded: false,
    },
    // optional plugins
    useSortBy,
    useExpanded,
    useRowSelect,
    useBlockLayout, // Makes element widths adjustable
    useResizeColumns
  );

  if (!template || !data.length) {
    return null;
  }

  return (
    <>
      {isMassEditing && <MassEditTable />}
      <TableToolHeader selectedRows={tableInstance.selectedFlatRows || []} />
      <Table tableInstance={tableInstance} />
      <TableFooter />
      <SubFileSelectionModal />
    </>
  );
}
