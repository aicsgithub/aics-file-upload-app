import { basename } from "path";

import { Icon, Tooltip } from "antd";
import classNames from "classnames";
import { isNil } from "lodash";
import React from "react";
import { useDispatch } from "react-redux";

import { openSubFileSelectionModal } from "../../../../../state/selection/actions";
import { TutorialStep } from "../../../../../state/types";
import TutorialTooltip from "../../../../TutorialTooltip";
import { CustomCell } from "../../DefaultCells/DisplayCell/DisplayCell";

const styles = require("./styles.pcss");

export default function FilenameCell({ column, row, value: file }: CustomCell) {
  const dispatch = useDispatch();
  const [isHighlighted, setIsHighlighted] = React.useState(false);
  const { positionIndex, scene, subImageName, channelId } = row.original;

  let subContent;
  let subImageType;
  let subImageValue;
  if (!isNil(positionIndex)) {
    subImageType = "Position";
    subImageValue = positionIndex;
  } else if (!isNil(scene)) {
    subImageType = "Scene";
    subImageValue = scene;
  } else if (!isNil(subImageName)) {
    subImageType = "";
    subImageValue = subImageName;
  }

  if (channelId) {
    const channelName = channelId;
    subContent = isNil(subImageValue)
      ? `${channelName} (all positions)`
      : `${subImageType} ${subImageValue}, ${channelName}`;
  } else if (subImageValue) {
    subContent = `${subImageType} ${subImageValue}`;
  }

  return (
    <div
      className={classNames(
        styles.fileCell,
        isHighlighted ? styles.highlight : undefined
      )}
      style={{ paddingLeft: `${row.depth * 15}px` }}
    >
      {row.canExpand && (
        <Icon
          className={styles.rowExpansionIcon}
          type={row.isExpanded ? "caret-down" : "caret-right"}
          {...row.getToggleRowExpandedProps({})}
        />
      )}
      <Tooltip mouseLeaveDelay={0} title={file}>
        <input
          readOnly
          tabIndex={-1}
          className={styles.fileCellInput}
          onBlur={() => setIsHighlighted(false)}
          onFocus={() => setIsHighlighted(true)}
          onClick={() => setIsHighlighted(true)}
          value={subContent || basename(file)}
        />
      </Tooltip>
      {!column.isReadOnly && !subContent && (
        <TutorialTooltip
          disabled={row.index !== 0}
          placement="right"
          step={TutorialStep.ADD_SCENES}
          title="Scenes, positions, or FOVs"
          message="Click here to annotate scenes, positions, or FOVs within a file"
        >
          <Tooltip
            mouseLeaveDelay={0}
            title="Click here to annotate scenes, positions, or FOVs within a file"
          >
            <Icon
              className={styles.subFileModalIcon}
              onClick={() => dispatch(openSubFileSelectionModal(file))}
              type={row.canExpand ? "edit" : "plus-circle"}
            />
          </Tooltip>
        </TutorialTooltip>
      )}
    </div>
  );
}
