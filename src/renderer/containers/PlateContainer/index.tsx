import { connect } from "react-redux";

import Plate from "../../components/Plate";
import { selectWells } from "../../state/selection/actions";
import { getSelectedWells, getWellsWithUnitsAndModified } from "../../state/selection/selectors";
import { State } from "../../state/types";
import { getUploadRowKey } from "../../state/upload/constants";
import { getUpload } from "../../state/upload/selectors";

interface Props {
    selectedFullPath: string;
    selectedPositionIndex?: number;
}

function mapStateToProps(state: State, { selectedFullPath, selectedPositionIndex }: Props) {
    const upload = getUpload(state);
    const metadata = upload[getUploadRowKey(selectedFullPath, selectedPositionIndex)];
    return {
        selectedWells: getSelectedWells(state),
        wells: getWellsWithUnitsAndModified(state),
        wellsWithAssociations: metadata ? metadata.wellIds : [],
    };
}

const dispatchToPropsMap = {
    onWellClick: selectWells,
};

// This container is used for the WellsEditor in order to bypass the lifecycle enforced by react-data-grid
// in which props are updated after onCommit() is called on the editor.
export default connect(mapStateToProps, dispatchToPropsMap)(Plate);
