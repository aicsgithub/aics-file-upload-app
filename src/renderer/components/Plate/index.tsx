import { AicsGrid, AicsGridCell } from "@aics/aics-react-labkey";
import * as React from "react";
import { WellIdToFilesMap } from "../../containers/AssociateWells/selectors";

import { Well } from "../../state/selection/types";

import WellComponent from "../Well";

const ASSOCIATED_WELL_COLOR = "rgb(156, 204, 132)"; // For wells that are associated with at least one file
const MODIFIED_WELL_COLOR = "rgb(221, 216, 241)"; // For non-empty wells that have not been associated with a file
const DEFAULT_WELL_COLOR = "rgb(226, 228, 227)"; // For empty wells
const WELL_WIDTH = "60px";

interface PlateProps {
    className?: string;
    onWellClick: (cells: AicsGridCell[]) => void;
    selectedWells: AicsGridCell[];
    wells: Well[][];
    wellIdToFiles: WellIdToFilesMap;
}

class Plate extends React.Component<PlateProps, {}> {
    public static getWellDisplayText(cellData: Well): JSX.Element {
        return <WellComponent well={cellData}/>;
    }

    constructor(props: PlateProps) {
        super(props);
        this.wellColorSelector = this.wellColorSelector.bind(this);
    }

    public wellColorSelector(cellData: Well): string {
        // if file count is not 0 or undefined, the well is associated with at least one file
        const associatedFiles = this.props.wellIdToFiles[cellData.wellId] || [];
        if (associatedFiles.length > 0) {
            return ASSOCIATED_WELL_COLOR;
        }

        return cellData.modified ? MODIFIED_WELL_COLOR : DEFAULT_WELL_COLOR;
    }

    public render() {
        const {
            className,
            selectedWells,
            wells,
            onWellClick,
        } = this.props;

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
