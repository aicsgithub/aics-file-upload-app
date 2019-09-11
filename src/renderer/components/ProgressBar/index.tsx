import { Icon, Steps, Tooltip } from "antd";
import { startCase } from "lodash";
import * as React from "react";

import { Page } from "../../state/selection/types";

const { Step } = Steps;

interface ProgressBarProps {
    className?: string;
    page: Page;
}

interface StepInfo {
    [step: string]: {
        description: string;
        icon: React.ReactNode;
    };
}

const stepOrder: StepInfo = {
    [Page.DragAndDrop]: {
        description: "Drag and drop folders/files to upload",
        icon: <Icon type="upload" />,
    },
    [Page.EnterBarcode]: {
        description: "Enter the Barcode of the Plate to associate with",
        icon: <Icon type="barcode" />,
    },
    [Page.AssociateFiles]: {
        description: "Associate Wells or Workflows with Files to upload",
        icon: <Icon type="file" />,
    },
    [Page.AddCustomData]: {
        description: "Add additional custom metadata to the file(s)",
        icon: <Icon type="edit"/>,
    },
};

const ProgressBar: React.FunctionComponent<ProgressBarProps> = (props) => {
    const { className, page } = props;

    const currentIndex = Object.keys(stepOrder).findIndex((step) => step === page);

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

    const createTitle = (step: string, index: number): React.ReactNode => (
        <Tooltip title={`${getStatus(index)}: ${stepOrder[step].description}`}>
            {startCase(step)}
        </Tooltip>
    );

    return (
        <div className={className}>
            <Steps
                size="small"
                current={currentIndex}
            >
                {Object.keys(stepOrder).map((step: string, index: number) => (
                    <Step
                        icon={index < currentIndex ? <Icon type="check-circle" /> : stepOrder[step].icon}
                        key={step}
                        title={createTitle(step, index)}
                    />
                ))}
            </Steps>
        </div>
    );
};

export default ProgressBar;
