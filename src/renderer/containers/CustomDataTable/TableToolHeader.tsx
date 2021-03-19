import { Button, Tooltip } from "antd";
import { isEmpty } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { startMassEdit } from "../../state/selection/actions";
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
}

export default function TableToolHeader(props: Props) {
  const dispatch = useDispatch();
  const canUndo = useSelector(getCanUndoUpload);
  const canRedo = useSelector(getCanRedoUpload);
  const selectedRowIds = props.selectedRows.map((row) => row.id);

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
            onClick={() => dispatch(startMassEdit(selectedRowIds))}
            disabled={isEmpty(props.selectedRows)}
            icon="edit"
            type="link"
          />
        </Tooltip>
      </TutorialTooltip>
      <Tooltip title="Delete Selected Rows" mouseLeaveDelay={0}>
        <Button
          onClick={() => dispatch(removeUploads(selectedRowIds))}
          disabled={isEmpty(props.selectedRows)}
          icon="delete"
          type="link"
        />
      </Tooltip>
    </div>
  );
}
