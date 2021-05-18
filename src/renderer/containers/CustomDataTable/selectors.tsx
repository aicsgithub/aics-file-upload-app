import { basename } from "path";

import { createSelector } from "reselect";

import {
  MAIN_FONT_WIDTH,
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
} from "../../constants";
import { ColumnType } from "../../services/labkey-client/types";
import { getAnnotationTypes } from "../../state/metadata/selectors";
import {
  getIsSelectedJobInFlight,
  getSelectedBarcode,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getTextWidth } from "../../util";
import FilenameCell from "../Table/CustomCells/FilenameCell";
import NotesCell from "../Table/CustomCells/NotesCell";
import SelectionCell from "../Table/CustomCells/SelectionCell";
import WellCell from "../Table/CustomCells/WellCell";
import ReadOnlyCell from "../Table/DefaultCells/ReadOnlyCell";
import SelectionHeader from "../Table/Headers/SelectionHeader";

import { CustomColumn } from "./types";

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
    sortType: (a, b) =>
      basename(a.original.file).localeCompare(basename(b.original.file)),
  },
  {
    accessor: NOTES_ANNOTATION_NAME,
    Cell: NotesCell,
    description: "Any additional text data (not ideal for querying)",
    maxWidth: 50,
  },
];

const MAX_HEADER_WIDTH = 200;

// Determine best width for column based on its type and header name
// tries to account for the header text width up to an upper limit
// to prevent extreme widths
function getColumnWidthForType(column: string, type?: ColumnType): number {
  // Find the max width between the words in the column header
  // so we can prevent words from breaking into pieces
  const maxWidth = column
    .split(" ")
    .reduce(
      (widthSoFar, word) =>
        Math.max(widthSoFar, getTextWidth("14px Nunito", word)),
      0
    );

  // Multiply by font width
  const maxFontWidth = maxWidth + 3 * MAIN_FONT_WIDTH;

  // Ensure minimum for type is met without creating too large
  // of headers
  switch (type) {
    case ColumnType.BOOLEAN:
      return Math.min(Math.max(75, maxFontWidth), MAX_HEADER_WIDTH);
    case ColumnType.DURATION:
      return 200;
    case ColumnType.NUMBER:
    case ColumnType.TEXT:
      return Math.min(Math.max(100, maxFontWidth), MAX_HEADER_WIDTH);
    default:
      return Math.min(Math.max(150, maxFontWidth), MAX_HEADER_WIDTH);
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
          width: getColumnWidthForType(annotation.name, type),
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
