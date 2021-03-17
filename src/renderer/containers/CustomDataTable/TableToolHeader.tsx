import { Button, Tooltip } from "antd";
import { isEmpty } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { TutorialStep } from "../../state/types";
import { jumpToUpload, removeUploads } from "../../state/upload/actions";
import {
  getCanRedoUpload,
  getCanUndoUpload,
} from "../../state/upload/selectors";
import TutorialTooltip from "../TutorialTooltip";

import { CustomRow } from "./types";

const styles = require("./styles.pcss");

interface Props {
  selectedRows: CustomRow[];
  setIsMassEditing: (isMassEditing: boolean) => void;
}

export default function TableToolHeader(props: Props) {
  const dispatch = useDispatch();
  const canUndo = useSelector(getCanUndoUpload);
  const canRedo = useSelector(getCanRedoUpload);

  function deleteSelectedRows() {
    // TODO: Change when start using rowId getter
    const rowIds = props.selectedRows.map((row) => row.original.rowId);
    dispatch(removeUploads(rowIds));
  }

  return (
    <div className={styles.tableToolHeader}>
      <Tooltip title="Undo" mouseLeaveDelay={0}>
        <Button
          onClick={() => dispatch(jumpToUpload(-1))}
          disabled={!canUndo}
          icon="undo"
          type="link"
        />
      </Tooltip>
      <Tooltip title="Redo" mouseLeaveDelay={0}>
        <Button
          onClick={() => dispatch(jumpToUpload(1))}
          disabled={!canRedo}
          icon="redo"
          type="link"
        />
      </Tooltip>
      <TutorialTooltip
        placement="right"
        step={TutorialStep.MASS_EDIT}
        title="Mass Edit"
        message="Select rows and click here to edit multiple rows at once"
      >
        <Tooltip title="Edit Selected Rows All at Once" mouseLeaveDelay={0}>
          <Button
            onClick={() => props.setIsMassEditing(true)}
            disabled={isEmpty(props.selectedRows)}
            icon="edit"
            type="link"
          />
        </Tooltip>
      </TutorialTooltip>
      <Tooltip title="Delete Selected Rows" mouseLeaveDelay={0}>
        <Button
          onClick={deleteSelectedRows}
          disabled={isEmpty(props.selectedRows)}
          icon="delete"
          type="link"
        />
      </Tooltip>
    </div>
    // {/* {isMassEditing && (
    //     <>
    //         <div className={styles.shadowBox} />
    //         <div className={styles.massEdit}>
    //         {this.props.showUploadHint && (
    //             <Alert
    //             afterClose={this.props.hideUploadHints}
    //             className={styles.hint}
    //             closable={true}
    //             message="Hint: Make edits below and all edits will be applied to selected rows. Click Apply to complete changes."
    //             showIcon={true}
    //             type="info"
    //             key="hint"
    //             />
    //         )}
    //         <div className={classNames(styles.dataGrid, className)}>
    //             <ReactDataGrid
    //             cellNavigationMode="loopOverRow"
    //             columns={this.getMassEditColumns()}
    //             enableCellSelect={true}
    //             minHeight={GRID_ROW_HEIGHT + GRID_BOTTOM_PADDING}
    //             onGridRowsUpdated={(e) => this.updateMassEditRows(e)}
    //             rowGetter={massEditRowGetter}
    //             rowsCount={1}
    //             />
    //         </div>
    //         <div className={styles.alignCenter}>
    //             <Button
    //             className={styles.massEditButton}
    //             type="danger"
    //             size="large"
    //             onClick={() => {
    //                 this.setState({ showMassEditGrid: false });
    //             }}
    //             >
    //             Cancel
    //             </Button>
    //             <Button
    //             className={styles.massEditButton}
    //             type="primary"
    //             size="large"
    //             onClick={() => this.updateRowsWithMassEditInfo()}
    //             >
    //             Apply
    //             </Button>
    //         </div>
    //         </div>
    //     </>
    //     )} */}
  );
}
