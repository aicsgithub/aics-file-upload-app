import { Steps, Tooltip } from "antd";
import { startCase } from "lodash";
import * as React from "react";

import { Page } from "../../state/types";

const { Step } = Steps;

interface ProgressBarProps {
  className?: string;
  page: Page;
}

interface StepInfo {
  description: string;
  display: string;
}

const stepOrder: { [stepName: string]: StepInfo } = {
  [Page.DragAndDrop]: {
    description: "Drag and drop folders/files to upload",
    display: "Drag and Drop",
  },
  [Page.SelectUploadType]: {
    description: "Choose how you want to associate data with your files",
    display: "Upload Type",
  },
  [Page.AddCustomData]: {
    description: "Add additional custom metadata to the files",
    display: "Add Metadata",
  },
};

/**
 * Displays all of the steps of the wizard and where the user is at.
 * @param props
 * @constructor
 */
const ProgressBar: React.FunctionComponent<ProgressBarProps> = (props) => {
  const { className, page } = props;

  const currentIndex = Object.keys(stepOrder).findIndex(
    (step) => step === page
  );

  const getStatus = (index: number): string => {
    if (index < currentIndex) {
      return "Finished";
    }
    if (index === currentIndex + 1) {
      return "Next";
    }
    if (index > currentIndex) {
      return "Later";
    }
    return "In Progress";
  };

  const createTitle = (step: StepInfo, index: number): React.ReactNode => (
    <Tooltip
      title={`${getStatus(index)}: ${step.description}`}
      mouseLeaveDelay={0}
    >
      {startCase(step.display)}
    </Tooltip>
  );

  return (
    <Steps
      className={className}
      size="small"
      current={currentIndex}
      labelPlacement="vertical"
    >
      {Object.values(stepOrder).map((step: StepInfo, index: number) => (
        <Step key={step.display} title={createTitle(step, index)} />
      ))}
    </Steps>
  );
};

export default ProgressBar;
