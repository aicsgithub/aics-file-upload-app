import { AicsGrid, AicsGridCell } from "@aics/aics-react-labkey";
import { includes } from "lodash";
import * as React from "react";

import { Well } from "../../state/selection/types";

import WellComponent from "../Well";

const ASSOCIATED_WELL_COLOR = "rgb(156, 204, 132)"; // For wells that are associated with at least one file
const MODIFIED_WELL_COLOR = "rgb(221, 216, 241)"; // For non-empty wells that have not been associated with a file
const DEFAULT_WELL_COLOR = "rgb(226, 228, 227)"; // For empty wells
const WELL_WIDTH = "50px";

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
class Plate extends React.Component<PlateProps, {}> {
  public static getWellDisplayText = (cellData: Well): JSX.Element => (
    <WellComponent well={cellData} />
  );

  constructor(props: PlateProps) {
    super(props);
  }

  public wellColorSelector = (cellData: Well): string => {
    if (includes(this.props.wellsWithAssociations, cellData.wellId)) {
      return ASSOCIATED_WELL_COLOR;
    }

    return cellData.modified ? MODIFIED_WELL_COLOR : DEFAULT_WELL_COLOR;
  };

  public render() {
    const { className, selectedWells, wells, onWellClick } = this.props;

    return (
      <div className={className}>
        <AicsGrid
          selectMode="multi"
          cellHeight={WELL_WIDTH}
          cellWidth={WELL_WIDTH}
          fontSize="14px"
          selectedCells={selectedWells}
          displayBackground={this.wellColorSelector}
          displayText={Plate.getWellDisplayText}
          cells={wells}
          onSelectedCellsChanged={onWellClick}
        />
      </div>
    );
  }
}

export default Plate;
