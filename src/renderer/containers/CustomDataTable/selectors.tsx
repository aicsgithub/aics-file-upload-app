import { basename } from "path";

import { createSelector } from "reselect";

import { MAIN_FONT_WIDTH, AnnotationName } from "../../constants";
import { ColumnType } from "../../services/labkey-client/types";
import {
  getAnnotations,
  getAnnotationTypes,
  getPlateBarcodeToImagingSessions,
} from "../../state/metadata/selectors";
import {
  getAreSelectedUploadsInFlight,
  getMassEditRow,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getUpload } from "../../state/upload/selectors";
import { getTextWidth } from "../../util";
import FilenameCell from "../Table/CustomCells/FilenameCell";
import ImagingSessionCell from "../Table/CustomCells/ImagingSessionCell";
import NotesCell from "../Table/CustomCells/NotesCell";
import PlateBarcodeCell from "../Table/CustomCells/PlateBarcodeCell";
import SelectionCell from "../Table/CustomCells/SelectionCell";
import WellCell from "../Table/CustomCells/WellCell";
import ReadOnlyCell from "../Table/DefaultCells/ReadOnlyCell";
import SelectionHeader from "../Table/Headers/SelectionHeader";

import { CustomColumn } from "./types";

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

const SELECTION_COLUMN: CustomColumn = {
  id: "selection",
  disableResizing: true,
  Header: SelectionHeader,
  Cell: SelectionCell,
  maxWidth: 35,
};

export const PLATE_BARCODE_COLUMN: CustomColumn = {
  accessor: AnnotationName.PLATE_BARCODE,
  Cell: PlateBarcodeCell,
  // This description was pulled from LK 07/16/21
  description: "The barcode for a Plate in LabKey	",
  width: getColumnWidthForType(AnnotationName.PLATE_BARCODE, ColumnType.LOOKUP),
};

export const IMAGING_SESSION_COLUMN: CustomColumn = {
  accessor: AnnotationName.IMAGING_SESSION,
  Cell: ImagingSessionCell,
  // This description was pulled from LK 07/16/21
  description:
    "Describes the session in which a plate is imaged. This is used especially when a single plate is imaged multiple times to identify each session (e.g. 2 hour - Drugs, 4 hour - Drugs)	",
  width: getColumnWidthForType(
    AnnotationName.IMAGING_SESSION,
    ColumnType.LOOKUP
  ),
};

export const WELL_COLUMN: CustomColumn = {
  accessor: AnnotationName.WELL,
  Cell: WellCell,
  // This description was pulled from LK 03/22/21
  description: "A well on a plate (that has been entered into the Plate UI)",
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

export const getTemplateColumnsForTable = createSelector(
  [
    getAnnotationTypes,
    getAppliedTemplate,
    getAnnotations,
    getUpload,
    getPlateBarcodeToImagingSessions,
    getMassEditRow,
  ],
  (
    annotationTypes,
    template,
    annotations,
    uploads,
    plateBarcodeToImagingSessions,
    massEditRow
  ): CustomColumn[] => {
    if (!template) {
      return [];
    }

    const columns: CustomColumn[] = [];

    const plateBarcodeAnnotation = annotations.find(
      (a) => a.name === AnnotationName.PLATE_BARCODE
    );
    columns.push({
      ...PLATE_BARCODE_COLUMN,
      description:
        plateBarcodeAnnotation?.description || PLATE_BARCODE_COLUMN.description,
    });

    // If the user has selected plate barcodes add Well as a column
    const selectedPlateBarcodes: string[] = massEditRow
      ? massEditRow[AnnotationName.PLATE_BARCODE] || []
      : Object.values(uploads).flatMap(
          (u) => u[AnnotationName.PLATE_BARCODE] || []
        );
    if (selectedPlateBarcodes.length) {
      // If any of the selected barcodes have imaging sessions add Imaging Session as a column
      const platesHaveImagingSessions = selectedPlateBarcodes.some(
        (pb) =>
          plateBarcodeToImagingSessions[pb] &&
          Object.values(plateBarcodeToImagingSessions[pb]).some((i) => i?.name)
      );
      if (platesHaveImagingSessions) {
        const imagingSessionAnnotation = annotations.find(
          (a) => a.name === AnnotationName.IMAGING_SESSION
        );
        columns.push({
          ...IMAGING_SESSION_COLUMN,
          description:
            imagingSessionAnnotation?.description ||
            IMAGING_SESSION_COLUMN.description,
        });
      }

      const wellAnnotation = annotations.find(
        (a) => a.name === AnnotationName.WELL
      );
      columns.push({
        ...WELL_COLUMN,
        description: wellAnnotation?.description || WELL_COLUMN.description,
      });
    }

    template.annotations.forEach((annotation) => {
      const type = annotationTypes.find(
        (type) => type.annotationTypeId === annotation.annotationTypeId
      )?.name;
      columns.push({
        type,
        accessor: annotation.name,
        description: annotation.description,
        dropdownValues: annotation.annotationOptions,
        isRequired: annotation.required,
        width: getColumnWidthForType(annotation.name, type),
      });
    });

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
