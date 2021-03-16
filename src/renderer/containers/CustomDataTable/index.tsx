import * as path from "path";

import React from "react";
import { useSelector } from "react-redux";
import { Column, useTable } from "react-table";

import { NOTES_ANNOTATION_NAME } from "../../constants";
import { getAnnotationTypes } from "../../state/metadata/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getUpload } from "../../state/upload/selectors";

import Editor from "./Cell";
import FilenameCell from "./CustomCells/FilenameCell";
import NotesCell from "./CustomCells/NotesCell";

const DEFAULT_COLUMNS: Column[] = [
  {
    accessor: "Filename",
    Cell: FilenameCell,
    Header: "File",
  },
  {
    accessor: NOTES_ANNOTATION_NAME,
    Cell: NotesCell,
    Header: NOTES_ANNOTATION_NAME,
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
            Header: annotation.name,
            editable: true,
            dropdownValues: annotation.annotationOptions,
          };
        })
      : [];
    return DEFAULT_COLUMNS.concat(columns);
  }, [annotationTypes, template]);
  const data = React.useMemo(() => {
    return Object.entries(upload).map(([rowId, uploadData]) => ({
      rowId,
      ...uploadData,
      Filename: path.basename(uploadData.file),
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
  } = useTable({
    columns,
    // Defines the default cell renderer
    defaultColumn: {
      Cell: Editor,
    },
    data,
    // onCellUpdate isn't part of the API, but
    // anything we put into these options will
    // automatically be available on the instance.
    // That way we can call this function from our
    // cell renderer!
    onCellUpdate,
  });

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
