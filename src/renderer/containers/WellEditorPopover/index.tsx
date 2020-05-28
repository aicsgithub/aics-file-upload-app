import { Button } from "antd";
import * as classNames from "classnames";
import { intersection, isEmpty } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { WELL_ANNOTATION_NAME } from "../../constants";
import { getSelectedWellIds } from "../../state/selection/selectors";
import { State } from "../../state/types";
import {
  associateFilesAndWells,
  undoFileWellAssociation,
} from "../../state/upload/actions";
import { getUploadRowKeyFromUploadTableRow } from "../../state/upload/constants";
import { getUpload } from "../../state/upload/selectors";
import {
  AssociateFilesAndWellsAction,
  UndoFileWellAssociationAction,
  UploadJobTableRow,
  UploadStateBranch,
} from "../../state/upload/types";
import ImagingSessionSelector from "../ImagingSessionSelector";
import Plate from "../PlateContainer";

const styles = require("./styles.pcss");

interface Props {
  associateFilesAndWells: ActionCreator<AssociateFilesAndWellsAction>;
  className?: string;
  rowData: UploadJobTableRow;
  selectedWellIds: number[];
  undoFileWellAssociation: ActionCreator<UndoFileWellAssociationAction>;
  upload: UploadStateBranch;
}

/**
 * This renders the popover contents used for the WellEditor component of the CustomDataGrid
 * It is required to be connected to the redux store because react-data-grid editors follow a lifecycle in which
 * their props only update when the editor is activated (i.e. double-clicked). We want real-time updates so we're
 * bypassing this lifecycle.
 */
class WellEditorPopover extends React.Component<Props, {}> {
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
    const { rowData } = this.props;
    this.props.associateFilesAndWells([rowData]);
  };

  private undoAssociation = (): void => {
    const { rowData } = this.props;
    this.props.undoFileWellAssociation(rowData, false);
  };

  // disable if no wells selected or if none of the wells selected have been associated with
  // the row yet
  private removeAssociationsBtnDisabled = (): boolean => {
    const { rowData, selectedWellIds, upload } = this.props;
    if (isEmpty(selectedWellIds)) {
      return true;
    }
    const uploadRow = upload[getUploadRowKeyFromUploadTableRow(rowData)];
    return (
      !uploadRow ||
      intersection(selectedWellIds, uploadRow.wellIds || []).length === 0
    );
  };

  // disable if no wells selected or if all of the wells have already been associated with
  // the row
  private associateBtnDisabled = (): boolean => {
    const { rowData, selectedWellIds, upload } = this.props;
    if (isEmpty(selectedWellIds)) {
      return true;
    }
    const uploadRow = upload[getUploadRowKeyFromUploadTableRow(rowData)];
    return (
      !uploadRow ||
      intersection(selectedWellIds, uploadRow[WELL_ANNOTATION_NAME] || [])
        .length === selectedWellIds.length
    );
  };
}

function mapStateToProps(state: State) {
  return {
    selectedWellIds: getSelectedWellIds(state),
    upload: getUpload(state),
  };
}

const dispatchToPropsMap = {
  associateFilesAndWells,
  undoFileWellAssociation,
};

export default connect(mapStateToProps, dispatchToPropsMap)(WellEditorPopover);
