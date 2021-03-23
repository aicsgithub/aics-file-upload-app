import { Alert, Button } from "antd";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useBlockLayout, useResizeColumns, useTable } from "react-table";

import { NOTES_ANNOTATION_NAME } from "../../constants";
import { getAnnotationTypes } from "../../state/metadata/selectors";
import { applyMassEdit, cancelMassEdit } from "../../state/selection/actions";
import {
  getMassEditRow,
  getRowsSelectedForMassEdit,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import Table from "../CustomDataTable/Table";
import NotesCell from "../CustomDataTable/Table/CustomCells/NotesCell/NotesCell";
import DefaultCell from "../CustomDataTable/Table/DefaultCells/DefaultCell/DefaultCell";
import ReadOnlyCell from "../CustomDataTable/Table/DefaultCells/ReadOnlyCell/ReadOnlyCell";
import DefaultHeader from "../CustomDataTable/Table/DefaultHeader/DefaultHeader";

const styles = require("./styles.pcss");

const ROW_COUNT_COLUMN = "# Files Selected";
const DEFAULT_COLUMNS = [
  {
    accessor: ROW_COUNT_COLUMN,
    Cell: ReadOnlyCell,
    description: "Number of rows this edit will be applied to",
    width: 75,
  },
  {
    accessor: NOTES_ANNOTATION_NAME,
    Cell: NotesCell,
    description: "Any additional text data (not ideal for querying)",
    maxWidth: 50,
  },
];

export default function MassEditTable() {
  const dispatch = useDispatch();
  const massEditRow = useSelector(getMassEditRow);
  const template = useSelector(getAppliedTemplate);
  const annotationTypes = useSelector(getAnnotationTypes);
  const rowsSelectedForMassEdit = useSelector(getRowsSelectedForMassEdit);

  const columns = React.useMemo(() => {
    const columns = template
      ? template.annotations.map((annotation) => {
          const type = annotationTypes.find(
            (type) => type.annotationTypeId === annotation.annotationTypeId
          )?.name;
          return {
            type,
            accessor: annotation.name,
            description: annotation.description,
            dropdownValues: annotation.annotationOptions,
          };
        })
      : [];
    return [...DEFAULT_COLUMNS, ...columns];
  }, [annotationTypes, template]);

  const data: any[] = React.useMemo(() => {
    return [
      {
        ...massEditRow,
        [ROW_COUNT_COLUMN]: rowsSelectedForMassEdit?.length,
      },
    ];
  }, [massEditRow, rowsSelectedForMassEdit]);

  const tableInstance = useTable(
    {
      columns,
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
    useBlockLayout, // Makes element widths adjustable
    useResizeColumns
  );

  return (
    <>
      <div className={styles.shadowBox} />
      <div className={styles.massEditTableContainer}>
        <Alert
          closable
          className={styles.hint}
          message="Hint: Make edits below and all edits will be applied to selected rows. Click Apply to complete changes."
          showIcon={true}
          type="info"
          key="hint"
        />
        <Table tableInstance={tableInstance} />
        <div className={styles.buttonRow}>
          <Button
            className={styles.cancelButton}
            onClick={() => dispatch(cancelMassEdit())}
          >
            Cancel
          </Button>
          <Button
            className={styles.applyButton}
            onClick={() => dispatch(applyMassEdit())}
          >
            Apply
          </Button>
        </div>
      </div>
    </>
  );
}
