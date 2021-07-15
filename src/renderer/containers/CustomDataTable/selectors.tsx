import { basename } from "path";

import { createSelector } from "reselect";

import { MAIN_FONT_WIDTH, AnnotationName } from "../../constants";
import { ColumnType } from "../../services/labkey-client/types";
import {
  getAnnotations,
  getAnnotationTypes,
} from "../../state/metadata/selectors";
import {
  getAreSelectedUploadsInFlight,
  getSelectedBarcode,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getTextWidth } from "../../util";
import FilenameCell from "../Table/CustomCells/FilenameCell";
import ImagingSessionCell from "../Table/CustomCells/ImagingSessionCell";
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
  id: AnnotationName.WELL,
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
    accessor: AnnotationName.NOTES,
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
  [getAnnotationTypes, getAppliedTemplate, getSelectedBarcode, getAnnotations],
  (annotationTypes, template, hasPlate, annotations): CustomColumn[] => {
    if (!template) {
      return [];
    }

    const templateAnnotations = [...template.annotations];
    const plateBarcodeAnnotation = annotations.find(
      (a) => a.name === AnnotationName.PLATE_BARCODE
    );
    if (plateBarcodeAnnotation) {
      templateAnnotations.push({ ...plateBarcodeAnnotation, required: false });
    }

    const columns: CustomColumn[] = template.annotations.map((annotation) => {
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
    });

    // TODO: Could refactor so that the triggers these rely on just add the annotation
    // into the template then when encountering those columns here swap out their Cell
    // property to be the custom cell needed

    // TODO: Remove the logic to pull in a plate via the well

    // If the user has selected a plate barcode on any row add the well column in
    if (hasPlate) {
      const wellAnnotation = annotations.find(
        (a) => a.name === AnnotationName.WELL
      );
      columns.push({
        ...WELL_COLUMN,
        description: wellAnnotation?.description || WELL_COLUMN.description,
      });

      // If the any plates the user has selected have included an imaging session add it
      if (true) {
        const imagingSessionAnnotation = annotations.find(
          (a) => a.name === AnnotationName.IMAGING_SESSION
        );
        columns.push({
          accessor: AnnotationName.IMAGING_SESSION,
          Cell: ImagingSessionCell,
          description: imagingSessionAnnotation?.description || "loading",
          width: 100,
        });
      }
    }

    return columns;
  }
);

export const getColumnsForTable = createSelector(
  [getTemplateColumnsForTable, getAreSelectedUploadsInFlight],
  (templateColumns, isReadOnly): CustomColumn[] => {
    if (isReadOnly) {
      const columns = templateColumns.map((column) => ({
        ...column,
        Cell: ReadOnlyCell,
      }));
      return [...DEFAULT_COLUMNS, ...columns].map((column) => ({
        ...column,
        isReadOnly: true,
      }));
    }
    return [SELECTION_COLUMN, ...DEFAULT_COLUMNS, ...templateColumns];
  }
);
