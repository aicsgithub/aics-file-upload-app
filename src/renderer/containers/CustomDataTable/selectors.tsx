import { createSelector } from "reselect";

import { NOTES_ANNOTATION_NAME } from "../../constants";
import { getAnnotationTypes } from "../../state/metadata/selectors";
import {
  getIsSelectedJobInFlight,
  getSelectedBarcode,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";

import FilenameCell from "./Table/CustomCells/FilenameCell";
import NotesCell from "./Table/CustomCells/NotesCell";
import SelectionCell from "./Table/CustomCells/SelectionCell";
import WellCell from "./Table/CustomCells/WellCell";
import { CustomColumn } from "./Table/DefaultCells/DisplayCell";
import ReadOnlyCell from "./Table/DefaultCells/ReadOnlyCell";
import SelectionHeader from "./Table/Headers/SelectionHeader";
import WellHeader from "./Table/Headers/WellHeader";

const SELECTION_COLUMN: CustomColumn = {
  id: "selection",
  disableResizing: true,
  Header: SelectionHeader,
  Cell: SelectionCell,
  maxWidth: 35,
};

const WELL_COLUMN = {
  accessor: "wellLabels",
  Header: WellHeader,
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

export const getTemplateColumnsForTable = createSelector(
  [getAnnotationTypes, getAppliedTemplate, getSelectedBarcode],
  (annotationTypes, template, hasPlate): CustomColumn[] => {
    if (!template) {
      return [];
    }
    return [
      ...(hasPlate ? [WELL_COLUMN] : []),
      ...template.annotations.map((annotation) => ({
        accessor: annotation.name,
        description: annotation.description,
        dropdownValues: annotation.annotationOptions,
        isRequired: annotation.required,
        type: annotationTypes.find(
          (type) => type.annotationTypeId === annotation.annotationTypeId
        )?.name,
      })),
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
