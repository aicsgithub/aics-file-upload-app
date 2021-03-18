import { Cell, Column, Row, TableInstance } from "react-table";

import { ColumnType } from "../../services/labkey-client/types";

export interface CustomTable extends TableInstance {
  selectedFlatRows?: CustomRow[];
}

export interface CustomRow extends Row {
  // This contains whatever the row data originally was
  original: any;

  // These props come from using the useExpanded plugin
  canExpand: boolean;
  depth: number;
  isExpanded: boolean;
  getToggleRowExpandedProps: (props: any) => void;

  // This prop comes from useRowSelect plugin
  getToggleRowSelectedProps: () => any;
}

export type CustomColumn = Column & {
  // Custom props supplied in column definition
  description?: string;
  dropdownValues?: string[];
  isReadOnly?: boolean;
  type?: ColumnType;

  // These props come from useSortedBy plugin
  isSorted?: boolean;
  isSortedDesc?: boolean;

  // This prop comes from the useResizeColumns plugin
  disableResizing?: boolean;
};

export type CustomCell = Cell & {
  row: CustomRow;
  column: CustomColumn;

  // This prop comes from useRowSelect plugin
  getToggleAllRowsSelectedProps: () => any;
};

// TODO: Remove if unused
export type CellValue = string[] | boolean | Date;
