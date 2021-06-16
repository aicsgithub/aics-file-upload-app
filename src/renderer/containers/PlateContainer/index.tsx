import { connect } from "react-redux";

import Plate from "../../components/Plate";
import { WELL_ANNOTATION_NAME } from "../../constants";
import { selectWells } from "../../state/selection/actions";
import {
  getSelectedWells,
  getWellsWithUnitsAndModified,
} from "../../state/selection/selectors";
import { MassEditRow, State } from "../../state/types";
import { UploadTableRow } from "../../state/upload/types";

interface Props {
  rowData: UploadTableRow | MassEditRow;
}

function mapStateToProps(state: State, { rowData }: Props) {
  return {
    selectedWells: getSelectedWells(state),
    wells: getWellsWithUnitsAndModified(state),
    wellsWithAssociations: rowData[WELL_ANNOTATION_NAME] || [],
  };
}

const dispatchToPropsMap = {
  onWellClick: selectWells,
};

// This container is used for the WellsEditor in order to bypass the lifecycle enforced by react-data-grid
// in which props are updated after onCommit() is called on the editor.
export default connect(mapStateToProps, dispatchToPropsMap)(Plate);
