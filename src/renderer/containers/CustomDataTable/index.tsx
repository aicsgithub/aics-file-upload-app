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
import { NOTES_ANNOTATION_NAME, WELL_ANNOTATION_NAME } from "../../constants";
import { getAnnotationTypes } from "../../state/metadata/selectors";
import {
  getIsSelectedJobInFlight,
  getMassEditRow,
  getSelectedBarcode,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getUploadRowKey } from "../../state/upload/constants";
import { getUploadSummaryRows } from "../../state/upload/selectors";
import MassEditTable from "../MassEditTable";

import Table from "./Table";
import FilenameCell from "./Table/CustomCells/FilenameCell/FilenameCell";
import NotesCell from "./Table/CustomCells/NotesCell/NotesCell";
import SelectionCell from "./Table/CustomCells/SelectionCell/SelectionCell";
import WellCell from "./Table/CustomCells/WellCell/WellCell";
import DefaultCell from "./Table/DefaultCells/DefaultCell/DefaultCell";
import {
  CustomCell,
  CustomColumn,
  CustomRow,
} from "./Table/DefaultCells/DisplayCell/DisplayCell";
import ReadOnlyCell from "./Table/DefaultCells/ReadOnlyCell/ReadOnlyCell";
import DefaultHeader from "./Table/DefaultHeader/DefaultHeader";
import TableFooter from "./TableFooter";
import TableToolHeader from "./TableToolHeader";

interface Props {
  hasSubmitBeenAttempted: boolean;
}

// TODO: Try specifying generic type
interface CustomTable extends TableInstance<any> {
  selectedFlatRows?: CustomRow[];
}

const SELECTION_COLUMN: CustomColumn = {
  id: "selection",
  disableResizing: true,
  Header: function CheckboxHeader({
    getToggleAllRowsSelectedProps,
  }: CustomCell) {
    return <SelectionCell {...getToggleAllRowsSelectedProps()} />;
  },
  Cell: function CheckboxCell({ row }: CustomCell) {
    return <SelectionCell {...row.getToggleRowSelectedProps()} />;
  },
  maxWidth: 35,
};

const WELL_COLUMN = {
  accessor: WELL_ANNOTATION_NAME,
  Cell: WellCell,
  // This description was pulled from LK 03/22/21
  description: "A well on a plate (that has been entered into the Plate UI)",
  isRequired: true,
};

const DEFAULT_COLUMNS: CustomColumn[] = [
  {
    accessor: "File",
    Cell: FilenameCell,
    description: "Filename of file supplied",
    width: 200,
  },
  {
    accessor: NOTES_ANNOTATION_NAME,
    Cell: NotesCell,
    description: "Any additional text data (not ideal for querying)",
    maxWidth: 50,
  },
];

export default function CustomDataTable({ hasSubmitBeenAttempted }: Props) {
  const rows = useSelector(getUploadSummaryRows);
  const template = useSelector(getAppliedTemplate);
  const hasPlate = useSelector(getSelectedBarcode);
  const isMassEditing = useSelector(getMassEditRow);
  const annotationTypes = useSelector(getAnnotationTypes);
  const isReadOnly = useSelector(getIsSelectedJobInFlight);

  const columns = React.useMemo(() => {
    let columns: CustomColumn[] = [];
    if (template) {
      columns = template.annotations.map((annotation) => ({
        type: annotationTypes.find(
          (type) => type.annotationTypeId === annotation.annotationTypeId
        )?.name,
        hasSubmitBeenAttempted,
        accessor: annotation.name,
        description: annotation.description,
        dropdownValues: annotation.annotationOptions,
        isRequired: annotation.required,
      }));
    }
    if (hasPlate) {
      columns = [{ ...WELL_COLUMN, hasSubmitBeenAttempted }, ...columns];
    }
    if (isReadOnly) {
      return [...DEFAULT_COLUMNS, ...columns].map((column) => ({
        ...column,
        isReadOnly: true,
        Cell: ReadOnlyCell,
      }));
    }
    return [SELECTION_COLUMN, ...DEFAULT_COLUMNS, ...columns];
  }, [annotationTypes, template, isReadOnly, hasSubmitBeenAttempted, hasPlate]);
  console.log(columns);

  const data = React.useMemo(() => {
    return rows;
  }, [rows]);
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
      // Prevents expanded rows from collapsing on update (useExpanded)
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
