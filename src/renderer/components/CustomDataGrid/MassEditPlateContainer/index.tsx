import { connect } from "react-redux";

import Plate from "../../../components/Plate";
import { WELL_ANNOTATION_NAME } from "../../../constants";
import { selectWells } from "../../../state/selection/actions";
import {
  getSelectedWells,
  getWellsWithUnitsAndModified,
} from "../../../state/selection/selectors";
import { MassEditRow } from "../../../state/selection/types";
import { State } from "../../../state/types";

interface Props {
  rowData: MassEditRow;
}

function mapStateToProps(state: State, { rowData }: Props) {
  return {
    selectedWells: getSelectedWells(state),
    wells: getWellsWithUnitsAndModified(state),
    wellsWithAssociations: rowData[WELL_ANNOTATION_NAME],
  };
}

const dispatchToPropsMap = {
  onWellClick: selectWells,
};

// This container is used for the WellsEditor in order to bypass the lifecycle enforced by react-data-grid
// in which props are updated after onCommit() is called on the editor.
export default connect(mapStateToProps, dispatchToPropsMap)(Plate);
