import { AicsGrid, AicsGridCell } from "@aics/aics-react-labkey";
import { clamp, includes } from "lodash";
import * as React from "react";

import WellComponent from "../../components/Well";
import { Well } from "../../state/selection/types";
import { useContainerDimensions } from "../../util/hooks";

const ASSOCIATED_WELL_COLOR = "rgb(156, 204, 132)"; // For wells that are associated with at least one file
const MODIFIED_WELL_COLOR = "rgb(221, 216, 241)"; // For non-empty wells that have not been associated with a file
const DEFAULT_WELL_COLOR = "rgb(226, 228, 227)"; // For empty wells
const MAX_WELL_WIDTH = 60; // px
const MIN_WELL_WIDTH = 10; // px
const ROW_EL_WIDTH = 25.4; // px width of the AICSGrid row label
const MIN_HEIGHT_TO_SHOW_WELL_INFO = 14 * 3; // 3 lines of text, line-height 14px

interface Props {
  associatedWellIds: number[];
  className?: string;
  onSelect: (wells: AicsGridCell[]) => void;
  selectedWells: AicsGridCell[];
  wells: Well[][];
}

/**
 * A readonly view of a plate saved through the Plate UI
 */
export default function Plate(props: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { width } = useContainerDimensions(ref);

  // We want to remove the amount of space taken up by things other than the cells
  // such as borders and the row label element width + its left and right borders
  const numColumns = props.wells[0].length;
  const offset = ROW_EL_WIDTH + 2 + 2 * numColumns;
  const wellWidth = clamp(
    (width - offset) / numColumns,
    MIN_WELL_WIDTH,
    MAX_WELL_WIDTH
  );

  return (
    <div className={props.className} ref={ref}>
      <AicsGrid
        selectMode="multi"
        cellHeight={`${wellWidth}px`}
        cellWidth={`${wellWidth}px`}
        fontSize="14px"
        selectedCells={props.selectedWells}
        displayBackground={(cellData: Well) => {
          if (includes(props.associatedWellIds, cellData.wellId)) {
            return ASSOCIATED_WELL_COLOR;
          }

          return cellData.modified ? MODIFIED_WELL_COLOR : DEFAULT_WELL_COLOR;
        }}
        displayText={(cellData: Well) =>
          wellWidth < MIN_HEIGHT_TO_SHOW_WELL_INFO ? (
            "..."
          ) : (
            <WellComponent well={cellData} />
          )
        }
        cells={props.wells}
        onSelectedCellsChanged={props.onSelect}
      />
    </div>
  );
}
