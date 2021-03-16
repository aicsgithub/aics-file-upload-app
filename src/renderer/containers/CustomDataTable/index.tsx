import * as path from "path";

import React from "react";
import { useSelector } from "react-redux";
import { useTable, useExpanded } from "react-table";

import { NOTES_ANNOTATION_NAME } from "../../constants";
import { getAnnotationTypes } from "../../state/metadata/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getUpload } from "../../state/upload/selectors";

import Cell, { CustomColumn } from "./Cell";
import FilenameCell from "./CustomCells/FilenameCell";
import NotesCell from "./CustomCells/NotesCell";
import Header from "./Header";

const DEFAULT_COLUMNS: CustomColumn[] = [
  {
    accessor: "Filename",
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

  const columns = React.useMemo(() => {
    const columns = template
      ? template.annotations.map((annotation) => {
          const type = annotationTypes.find(
            (type) => type.annotationTypeId === annotation.annotationTypeId
          )?.name;
          return {
            type,
            accessor: annotation.name,
            editable: true,
            description: annotation.description,
            dropdownValues: annotation.annotationOptions,
          };
        })
      : [];
    return DEFAULT_COLUMNS.concat(columns);
  }, [annotationTypes, template]);
  const data = React.useMemo(() => {
    return Object.entries(upload).map(([rowId, uploadData]) => ({
      // Rather than supply our own (if still necessary after subRows
      // is figured out), use custom getRowId()
      rowId,
      ...uploadData,
      Filename: path.basename(uploadData.file),
      // TODO: The way we organize our data needs to be pivoted
      subRows: [{ subRows: [{ subRows: [] }] }],
    }));
  }, [upload]);

  const onCellUpdate = (rowId: string, columnId: number, value: any) => {
    // We also turn on the flag to not reset the page
    console.log("updating data", rowId, columnId, value);
    // dispatch(updateCell(rowId, columnId, value));
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    {
      columns,
      // Defines the default column properties, can be overriden per column
      defaultColumn: { Cell, Header },
      data,
      // onCellUpdate isn't part of the API, but
      // anything we put into these options will
      // automatically be available on the instance.
      // That way we can call this function from our
      // cell renderer!
      onCellUpdate,
    },
    useExpanded
  );

  return (
    <table {...getTableProps()}>
      <thead>
        {headerGroups.map((headerGroup) => (
          <tr
            {...headerGroup.getHeaderGroupProps()}
            key={headerGroup.getHeaderGroupProps().key}
          >
            {headerGroup.headers.map((column) => (
              <th
                {...column.getHeaderProps()}
                key={column.getHeaderProps().key}
              >
                {column.render("Header")}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {rows.map((row) => {
          prepareRow(row);
          console.log(row.subRows);
          return (
            <tr {...row.getRowProps()} key={row.getRowProps().key}>
              {row.cells.map((cell) => (
                <td
                  {...cell.getCellProps()}
                  key={cell.getCellProps().key}
                  style={{
                    border: "1px solid black",
                    height: "30px",
                    width: "100px",
                  }}
                >
                  {cell.render("Cell")}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
