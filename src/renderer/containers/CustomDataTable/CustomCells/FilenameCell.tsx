import { Icon, Tooltip } from "antd";
import React from "react";

import { TutorialStep } from "../../../state/types";
import TutorialTooltip from "../../TutorialTooltip";
import { CustomCell } from "../Cell";

export default function FilenameCell({ row, value }: CustomCell) {
  //   const dispatch = useDispatch();
  function openSubFileSelectionModal() {
    // dispatch(openSubFileSelectionModal(value));
  }

  return (
    <div
      style={{
        height: "30px",
        width: "100px",
        display: "flex",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {row.canExpand && (
        <Icon
          type={row.isExpanded ? "caret-down" : "caret-right"}
          {...row.getToggleRowExpandedProps({
            style: { marginTop: "4px", paddingLeft: `${row.depth * 2}rem` },
          })}
        />
      )}
      <Tooltip mouseLeaveDelay={0} title={value} style={{ width: "70px" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {value}
        </span>
      </Tooltip>
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
            onClick={openSubFileSelectionModal}
            type={row.canExpand ? "edit" : "plus-circle"}
            style={{ marginTop: "4px" }}
          />
        </Tooltip>
      </TutorialTooltip>
    </div>
  );
}
