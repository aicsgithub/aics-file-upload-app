import { AicsGrid, AicsGridCell } from "@aics/aics-react-labkey";
import { clamp, includes } from "lodash";
import React, { useRef } from "react";

import { Well } from "../../state/selection/types";
import { useContainerDimensions } from "../../util/stateful-logic";

import WellComponent from "../Well";

const ASSOCIATED_WELL_COLOR = "rgb(156, 204, 132)"; // For wells that are associated with at least one file
const MODIFIED_WELL_COLOR = "rgb(221, 216, 241)"; // For non-empty wells that have not been associated with a file
const DEFAULT_WELL_COLOR = "rgb(226, 228, 227)"; // For empty wells
const MAX_WELL_WIDTH = 60; // px
const MIN_WELL_WIDTH = 30; // px

interface PlateProps {
  className?: string;
  onWellClick: (cells: AicsGridCell[]) => void;
  selectedWells: AicsGridCell[];
  wells: Well[][];
  wellsWithAssociations: number[];
}

/**
 * A readonly view of a plate saved through the Plate UI
 */
function Plate(props: PlateProps) {
  const { className, selectedWells, wells, onWellClick } = props;
  const ref = useRef<HTMLDivElement>(null);
  const { width } = useContainerDimensions(ref);
  const numColumns = wells[0].length;
  const wellWidth = clamp(width / numColumns, MIN_WELL_WIDTH, MAX_WELL_WIDTH);
  return (
    <div className={className} ref={ref}>
      <AicsGrid
        selectMode="multi"
        cellHeight={`${wellWidth}px`}
        cellWidth={`${wellWidth}px`}
        fontSize="14px"
        selectedCells={selectedWells}
        displayBackground={(cellData: Well) => {
          if (includes(props.wellsWithAssociations, cellData.wellId)) {
            return ASSOCIATED_WELL_COLOR;
          }

          return cellData.modified ? MODIFIED_WELL_COLOR : DEFAULT_WELL_COLOR;
        }}
        displayText={(cellData: Well) => <WellComponent well={cellData} />}
        cells={wells}
        onSelectedCellsChanged={onWellClick}
      />
    </div>
  );
}

export default Plate;
