import { Icon, Tooltip } from "antd";
import classNames from "classnames";
import React from "react";

import { TutorialStep } from "../../../../state/types";
import TutorialTooltip from "../../../TutorialTooltip";
import { CustomCell } from "../../types";

const styles = require("../styles.pcss");

export default function FilenameCell({ column, row, value }: CustomCell) {
  const [isHighlighted, setIsHighlighted] = React.useState(false);
  const [isSubFileModalOpen, setIsSubFileModalOpen] = React.useState(false);

  // TODO: Remove
  if (isSubFileModalOpen) {
    return null;
  }

  return (
    <div
      className={classNames(
        styles.fileCell,
        isHighlighted ? styles.highlight : undefined
      )}
    >
      {row.canExpand && (
        <Icon
          className={styles.cellIcon}
          type={row.isExpanded ? "caret-down" : "caret-right"}
          // TODO: Figure out if all props are meant to be passed in like this
          {...row.getToggleRowExpandedProps({
            style: { paddingLeft: `${row.depth * 2}rem` },
          })}
        />
      )}
      <Tooltip mouseLeaveDelay={0} title={row.original.file}>
        <input
          readOnly
          tabIndex={-1}
          className={styles.fileCellInput}
          onBlur={() => setIsHighlighted(false)}
          onFocus={() => setIsHighlighted(true)}
          onClick={() => setIsHighlighted(true)}
          value={value}
        />
      </Tooltip>
      {!column.isReadOnly && (
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
              className={styles.cellIcon}
              onClick={() => setIsSubFileModalOpen(true)}
              type={row.canExpand ? "edit" : "plus-circle"}
            />
          </Tooltip>
        </TutorialTooltip>
      )}
      {/* <SubFileSelectionModal visible={isSubFileModalOpen} /> */}
    </div>
  );
}
