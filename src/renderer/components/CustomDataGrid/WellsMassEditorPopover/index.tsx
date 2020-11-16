import { Button } from "antd";
import * as classNames from "classnames";
import { intersection, isEmpty, uniq, without } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { WELL_ANNOTATION_NAME } from "../../../constants";
import ImagingSessionSelector from "../../../containers/ImagingSessionSelector";
import { updateMassEditRow } from "../../../state/selection/actions";
import {
  getSelectedWellIds,
  getSelectedWellLabels,
} from "../../../state/selection/selectors";
import { UpdateMassEditRowAction } from "../../../state/selection/types";
import { MassEditRow, State, UploadStateBranch } from "../../../state/types";
import {
  associateFilesAndWells,
  undoFileWellAssociation,
} from "../../../state/upload/actions";
import { getUpload } from "../../../state/upload/selectors";
import Plate from "../MassEditPlateContainer";

const styles = require("../style.pcss");

interface Props {
  className?: string;
  rowData: MassEditRow;
  selectedWellIds: number[];
  selectedWellLabels: string[];
  upload: UploadStateBranch;
  updateMassEditRow: ActionCreator<UpdateMassEditRowAction>;
}

/**
 * This renders the popover contents used for the WellEditor component of the CustomDataGrid
 * It is required to be connected to the redux store because react-data-grid editors follow a lifecycle in which
 * their props only update when the editor is activated (i.e. double-clicked). We want real-time updates so we're
 * bypassing this lifecycle.
 */
class WellsMassEditorPopover extends React.Component<Props, {}> {
  public render() {
    const { className, rowData } = this.props;

    return (
      <div className={styles.container}>
        <div className={classNames(className, styles.row)}>
          <ImagingSessionSelector className={styles.imagingSessionSelector} />
          <div className={styles.btns}>
            <Button
              onClick={this.associateWithRow}
              size="small"
              type="primary"
              className={styles.associateBtn}
              disabled={this.associateBtnDisabled()}
            >
              Associate
            </Button>
            <Button
              onClick={this.undoAssociation}
              disabled={this.removeAssociationsBtnDisabled()}
              size="small"
            >
              Remove Association
            </Button>
          </div>
        </div>
        <div className={styles.plateContainer}>
          <Plate rowData={rowData} className={styles.plate} />
        </div>
      </div>
    );
  }

  private associateWithRow = (): void => {
    const { rowData, selectedWellIds, selectedWellLabels } = this.props;
    this.props.updateMassEditRow({
      ...rowData,
      [WELL_ANNOTATION_NAME]: uniq(
        rowData[WELL_ANNOTATION_NAME].concat(selectedWellIds)
      ),
      wellLabels: selectedWellLabels,
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
      wellLabels: selectedWellLabels,
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
