import * as path from "path";

import React from "react";
import { useSelector } from "react-redux";
import {
  useTable,
  useExpanded,
  useRowSelect,
  useSortBy,
  useBlockLayout,
} from "react-table";

import { NOTES_ANNOTATION_NAME } from "../../constants";
import { getAnnotationTypes } from "../../state/metadata/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getUpload } from "../../state/upload/selectors";

import Table from "./Table";
import DefaultCell from "./Table/cells/DefaultCell";
import FilenameCell from "./Table/cells/FilenameCell";
import NotesCell from "./Table/cells/NotesCell";
import SelectionCell from "./Table/cells/SelectionCell";
import DefaultHeader from "./Table/DefaultHeader";
import TableFooter from "./TableFooter";
import TableToolHeader from "./TableToolHeader";
import { CustomCell, CustomColumn, CustomTable } from "./types";

const DEFAULT_COLUMNS: CustomColumn[] = [
  {
    id: "selection",
    Header: function CheckboxHeader({
      getToggleAllRowsSelectedProps,
    }: CustomCell) {
      return <SelectionCell {...getToggleAllRowsSelectedProps()} />;
    },
    Cell: function CheckboxCell({ row }: CustomCell) {
      return <SelectionCell {...row.getToggleRowSelectedProps()} />;
    },
    width: 35,
  },
  {
    accessor: "File",
    Cell: FilenameCell,
    description: "Filename of file supplied",
  },
  {
    accessor: NOTES_ANNOTATION_NAME,
    Cell: NotesCell,
    description: "Any additional text data (not ideal for querying)",
  },
];

export default function CustomDataTable() {
  const upload = useSelector(getUpload);
  const template = useSelector(getAppliedTemplate);
  const annotationTypes = useSelector(getAnnotationTypes);
  const [isMassEditing, setIsMassEditing] = React.useState(false);

  const columns = React.useMemo(() => {
    const columns = template
      ? template.annotations.map((annotation) => {
          const type = annotationTypes.find(
            (type) => type.annotationTypeId === annotation.annotationTypeId
          )?.name;
          return {
            type,
            accessor: annotation.name,
            isReadOnly: false, // TODO:
            description: annotation.description,
            dropdownValues: annotation.annotationOptions,
          };
        })
      : [];
    return DEFAULT_COLUMNS.concat(columns);
  }, [annotationTypes, template]);

  const data = React.useMemo(() => {
    // TODO: this won't work, not empty
    if (isMassEditing) {
      const [rowId, uploadData] = Object.entries(upload)[0];
      return [
        {
          rowId,
          ...uploadData,
        },
      ];
    }
    return Object.entries(upload).map(([rowId, uploadData]) => ({
      // Rather than supply our own (if still necessary after subRows
      // is figured out), use custom getRowId()
      rowId,
      ...uploadData,
      File: path.basename(uploadData.file),
      // TODO: The way we organize our data needs to be pivoted
      subRows: [{ subRows: [{ subRows: [] }] }],
    }));
  }, [upload, isMassEditing]);

  const tableInstance: CustomTable = useTable(
    {
      columns,
      // Defines the default column properties, can be overriden per column
      defaultColumn: {
        Cell: DefaultCell,
        Header: DefaultHeader,
        maxWidth: 100,
      },
      data,
    },
    // optional plugins
    useSortBy,
    useExpanded,
    useRowSelect,
    useBlockLayout // Makes element widths adjustable
  );

  if (!template || !data.length) {
    return null;
  }

  return (
    <>
      <TableToolHeader
        selectedRows={tableInstance.selectedFlatRows || []}
        setIsMassEditing={setIsMassEditing}
      />
      <Table tableInstance={tableInstance} />
      <TableFooter />
    </>
  );
}
