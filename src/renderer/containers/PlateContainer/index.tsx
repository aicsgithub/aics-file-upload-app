import { connect } from "react-redux";

import Plate from "../../components/Plate";
import { WELL_ANNOTATION_NAME } from "../../constants";
import { selectWells } from "../../state/selection/actions";
import {
  getSelectedWells,
  getWellsWithUnitsAndModified,
} from "../../state/selection/selectors";
import { MassEditRow, State } from "../../state/types";
import { getUploadRowKeyFromUploadTableRow } from "../../state/upload/constants";
import { getUpload } from "../../state/upload/selectors";
import { UploadJobTableRow } from "../../state/upload/types";

interface Props {
  rowData: UploadJobTableRow | MassEditRow;
}

function mapStateToProps(state: State, { rowData }: Props) {
  const upload = getUpload(state);
  let wellsWithAssociations;
  if (!rowData.massEditNumberOfFiles) {
    const metadata =
      upload[getUploadRowKeyFromUploadTableRow(rowData as UploadJobTableRow)];
    wellsWithAssociations = metadata[WELL_ANNOTATION_NAME];
  } else {
    wellsWithAssociations = rowData[WELL_ANNOTATION_NAME];
  }

  return {
    selectedWells: getSelectedWells(state),
    wells: getWellsWithUnitsAndModified(state),
    wellsWithAssociations: wellsWithAssociations || [],
  };
}

const dispatchToPropsMap = {
  onWellClick: selectWells,
};

// This container is used for the WellsEditor in order to bypass the lifecycle enforced by react-data-grid
// in which props are updated after onCommit() is called on the editor.
export default connect(mapStateToProps, dispatchToPropsMap)(Plate);
