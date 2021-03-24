import { createSelector } from "reselect";

import { NOTES_ANNOTATION_NAME, WELL_ANNOTATION_NAME } from "../../constants";
import { ColumnType } from "../../services/labkey-client/types";
import { getAnnotationTypes } from "../../state/metadata/selectors";
import {
  getIsSelectedJobInFlight,
  getSelectedBarcode,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import FilenameCell from "../Table/CustomCells/FilenameCell";
import NotesCell from "../Table/CustomCells/NotesCell";
import SelectionCell from "../Table/CustomCells/SelectionCell";
import WellCell from "../Table/CustomCells/WellCell";
import { CustomColumn } from "../Table/DefaultCells/DisplayCell";
import ReadOnlyCell from "../Table/DefaultCells/ReadOnlyCell";
import SelectionHeader from "../Table/Headers/SelectionHeader";

const SELECTION_COLUMN: CustomColumn = {
  id: "selection",
  disableResizing: true,
  Header: SelectionHeader,
  Cell: SelectionCell,
  maxWidth: 35,
};

const WELL_COLUMN: CustomColumn = {
  accessor: "wellLabels",
  id: WELL_ANNOTATION_NAME,
  Cell: WellCell,
  // This description was pulled from LK 03/22/21
  description: "A well on a plate (that has been entered into the Plate UI)",
  isRequired: true,
  width: 100,
};

const DEFAULT_COLUMNS: CustomColumn[] = [
  {
    accessor: "file",
    id: "File",
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

function getColumnWidthForType(type?: ColumnType): number {
  switch (type) {
    case ColumnType.BOOLEAN:
      return 75;
    case ColumnType.NUMBER:
    case ColumnType.TEXT:
      return 100;
    default:
      return 150;
  }
}

export const getTemplateColumnsForTable = createSelector(
  [getAnnotationTypes, getAppliedTemplate, getSelectedBarcode],
  (annotationTypes, template, hasPlate): CustomColumn[] => {
    if (!template) {
      return [];
    }
    return [
      ...(hasPlate ? [WELL_COLUMN] : []),
      ...template.annotations.map((annotation) => {
        const type = annotationTypes.find(
          (type) => type.annotationTypeId === annotation.annotationTypeId
        )?.name;
        return {
          type,
          accessor: annotation.name,
          description: annotation.description,
          dropdownValues: annotation.annotationOptions,
          isRequired: annotation.required,
          width: getColumnWidthForType(type),
        };
      }),
    ];
  }
);

export const getColumnsForTable = createSelector(
  [getTemplateColumnsForTable, getIsSelectedJobInFlight],
  (templateColumns, isReadOnly): CustomColumn[] => {
    if (isReadOnly) {
      return [...DEFAULT_COLUMNS, ...templateColumns].map((column) => ({
        ...column,
        isReadOnly: true,
        Cell: ReadOnlyCell,
      }));
    }
    return [SELECTION_COLUMN, ...DEFAULT_COLUMNS, ...templateColumns];
  }
);
