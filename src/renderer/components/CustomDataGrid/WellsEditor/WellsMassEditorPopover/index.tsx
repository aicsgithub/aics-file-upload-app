import { intersection, isEmpty, uniq, without } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { WELL_ANNOTATION_NAME } from "../../../../constants";
import { updateMassEditRow } from "../../../../state/selection/actions";
import {
  getSelectedWellIds,
  getSelectedWellLabels,
} from "../../../../state/selection/selectors";
import { UpdateMassEditRowAction } from "../../../../state/selection/types";
import { MassEditRow, State, UploadStateBranch } from "../../../../state/types";
import {
  associateFilesAndWells,
  undoFileWellAssociation,
} from "../../../../state/upload/actions";
import { getUpload } from "../../../../state/upload/selectors";
import WellsEditorPopover from "../WellsEditorCommon";

interface Props {
  className?: string;
  rowData: MassEditRow;
  selectedWellIds: number[];
  selectedWellLabels: string[];
  upload: UploadStateBranch;
  updateMassEditRow: ActionCreator<UpdateMassEditRowAction>;
}

class WellsMassEditorPopover extends React.Component<Props, {}> {
  public render() {
    const { className, rowData } = this.props;

    return (
      <WellsEditorPopover
        className={className}
        associateWithRow={this.associateWithRow}
        associateBtnDisabled={this.associateBtnDisabled}
        removeAssociationsBtnDisabled={this.removeAssociationsBtnDisabled}
        rowData={rowData}
        undoAssociation={this.undoAssociation}
      />
    );
  }

  private associateWithRow = (): void => {
    const { rowData, selectedWellIds, selectedWellLabels } = this.props;
    this.props.updateMassEditRow({
      ...rowData,
      [WELL_ANNOTATION_NAME]: uniq(
        rowData[WELL_ANNOTATION_NAME].concat(selectedWellIds)
      ),
      wellLabels: rowData["wellLabels"].concat(selectedWellLabels),
    });
  };

  private undoAssociation = (): void => {
    const { rowData, selectedWellIds, selectedWellLabels } = this.props;
    this.props.updateMassEditRow({
      ...rowData,
      [WELL_ANNOTATION_NAME]: without(
        rowData[WELL_ANNOTATION_NAME],
        ...selectedWellIds
      ),
      wellLabels: without(rowData["wellLabels"], ...selectedWellLabels),
    });
  };

  // disable if no wells selected or if none of the wells selected have been associated with
  // the row yet
  private removeAssociationsBtnDisabled = (): boolean => {
    const { rowData, selectedWellIds } = this.props;
    if (isEmpty(selectedWellIds)) {
      return true;
    }
    return (
      !rowData[WELL_ANNOTATION_NAME] ||
      intersection(selectedWellIds, rowData[WELL_ANNOTATION_NAME] || [])
        .length === 0
    );
  };

  // disable if no wells selected or if all of the wells have already been associated with
  // the row
  private associateBtnDisabled = (): boolean => {
    const { rowData, selectedWellIds } = this.props;
    if (isEmpty(selectedWellIds)) {
      return true;
    }
    return (
      !rowData[WELL_ANNOTATION_NAME] ||
      intersection(selectedWellIds, rowData[WELL_ANNOTATION_NAME] || [])
        .length === selectedWellIds.length
    );
  };
}

function mapStateToProps(state: State) {
  return {
    selectedWellIds: getSelectedWellIds(state),
    selectedWellLabels: getSelectedWellLabels(state),
    upload: getUpload(state),
  };
}

const dispatchToPropsMap = {
  associateFilesAndWells,
  undoFileWellAssociation,
  updateMassEditRow,
};

export default connect(
  mapStateToProps,
  dispatchToPropsMap
)(WellsMassEditorPopover);
