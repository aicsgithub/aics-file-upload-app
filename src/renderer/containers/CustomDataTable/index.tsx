import * as path from "path";

import React from "react";
import { useSelector } from "react-redux";
import {
  useTable,
  useExpanded,
  useRowSelect,
  useSortBy,
  useBlockLayout,
  useResizeColumns,
} from "react-table";

import SubFileSelectionModal from "../../components/SubFileSelectionModal.tsx";
import { NOTES_ANNOTATION_NAME, WELL_ANNOTATION_NAME } from "../../constants";
import { getAnnotationTypes } from "../../state/metadata/selectors";
import { getMassEditRow } from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getUploadRowKey } from "../../state/upload/constants";
import { getUpload } from "../../state/upload/selectors";
import MassEditTable from "../MassEditTable";

import Table from "./Table";
import DefaultCell from "./Table/cells/DefaultCell";
import FilenameCell from "./Table/cells/FilenameCell";
import NotesCell from "./Table/cells/NotesCell";
import ReadOnlyCell from "./Table/cells/ReadOnlyCell";
import SelectionCell from "./Table/cells/SelectionCell";
import WellCell from "./Table/cells/WellCell";
import DefaultHeader from "./Table/DefaultHeader";
import TableFooter from "./TableFooter";
import TableToolHeader from "./TableToolHeader";
import { CustomCell, CustomColumn, CustomTable } from "./types";

const DEFAULT_COLUMNS: CustomColumn[] = [
  {
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
  },
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

export default function CustomDataTable() {
  const upload = useSelector(getUpload);
  const template = useSelector(getAppliedTemplate);
  const isMassEditing = useSelector(getMassEditRow);
  const annotationTypes = useSelector(getAnnotationTypes);
  const isReadOnly = false; // TODO: useSelector(getUploadIsReadOnly);
  console.log(isMassEditing);

  const columns = React.useMemo(() => {
    const columns = template
      ? template.annotations.map((annotation) => {
          const type = annotationTypes.find(
            (type) => type.annotationTypeId === annotation.annotationTypeId
          )?.name;
          let Cell;
          if (isReadOnly) {
            Cell = ReadOnlyCell;
          } else if (annotation.name === WELL_ANNOTATION_NAME) {
            Cell = WellCell;
          }
          return {
            type,
            isReadOnly,
            accessor: annotation.name,
            description: annotation.description,
            dropdownValues: annotation.annotationOptions,
            ...(Cell && { Cell }),
          };
        })
      : [];
    return [...DEFAULT_COLUMNS, ...columns];
  }, [annotationTypes, template, isReadOnly]);

  const data = React.useMemo(() => {
    return Object.values(upload).map((uploadData) => ({
      ...uploadData,
      File: path.basename(uploadData.file),
      // TODO: The way we organize our data needs to be pivoted
      // subRows: [{ subRows: [{ subRows: [] }] }],
    }));
  }, [upload]);
  console.log("upload, data", upload, data);

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
