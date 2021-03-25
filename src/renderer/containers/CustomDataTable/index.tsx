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

import { getMassEditRow } from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { UploadMetadata } from "../../state/types";
import { getUploadRowKey } from "../../state/upload/constants";
import { getUploadAsTableRows } from "../../state/upload/selectors";
import MassEditTable from "../MassEditTable";
import SubFileSelectionModal from "../SubFileSelectionModal";
import Table from "../Table";
import DefaultCell from "../Table/DefaultCells/DefaultCell";
import { CustomRow } from "../Table/DefaultCells/DisplayCell";
import DefaultHeader from "../Table/Headers/DefaultHeader";

import { getColumnsForTable } from "./selectors";
import TableFooter from "./TableFooter";
import TableToolHeader from "./TableToolHeader";

const ARRAY_SORT = "ARRAY_SORT";

interface Props {
  hasSubmitBeenAttempted: boolean;
}

interface CustomTable extends TableInstance<UploadMetadata> {
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
  // Necessary to supply our own custom sorting since the
  // row values are arrays for which react-table does not
  // handle by default at the moment - Sean M 03/23/21
  const sortTypes = React.useMemo(
    () => ({
      [ARRAY_SORT]: (
        rowA: UploadMetadata,
        rowB: UploadMetadata,
        columnId: string
      ) =>
        `${rowA.original[columnId]}`.localeCompare(
          `${rowB.original[columnId]}`
        ),
    }),
    []
  );

  const tableInstance: CustomTable = useTable(
    {
      columns,
      data,
      // Defines the default column properties, can be overriden per column
      defaultColumn: {
        Cell: DefaultCell,
        Header: DefaultHeader,
        minWidth: 30,
        width: 150,
        maxWidth: 500,
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore: The react-table typing does not account for the typing
        // of plugins as such this is not known by typescript though
        // is necessary for the useSortBy plugin to know how which sorting
        // method to use by default for columns. This specific sortType
        // is a custom one that we supply - Sean M 03/23/21
        sortType: ARRAY_SORT,
      },
      getRowId: React.useMemo(() => getUploadRowKey, []),
      // This comes from the useExpanded plugin and prevents
      // sorting from reseting after data is modified - Sean M 03/23/21
      autoResetExpanded: false,
      // Similarly to the above property this comes from a plugin, useSortBy,
      // and prevents sorting from reseting after data is modified
      autoResetSortBy: false,
      // This comes from the useSortBy plugin and adds additional sorting
      // options as a function of the column's "sortType" specified
      sortTypes,
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
