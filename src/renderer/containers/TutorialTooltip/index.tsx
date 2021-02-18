import { Button, Popover } from "antd";
import { isNil } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { setTutorialTooltipStep } from "../../state/feedback/actions";
import { getTutorialStep } from "../../state/feedback/selectors";
import { updateSettings } from "../../state/setting/actions";
import { getShowUploadHint } from "../../state/setting/selectors";

const styles = require("./styles.pcss");

export enum TutorialStep {
  MASS_EDIT,
  ADD_SCENES,
}

interface TutorialInfo {
  title: string;
  message: string;
  next?: TutorialStep;
  previous?: TutorialStep;
}

const STEP_TO_INFO: { [step: number]: TutorialInfo } = {
  [TutorialStep.MASS_EDIT]: {
    title: "Mass Edit",
    message: "Select rows and click here to edit multiple rows at once",
    next: TutorialStep.ADD_SCENES,
  },
  [TutorialStep.ADD_SCENES]: {
    title: "Sub Images, Channels, Scenes",
    message: "Click here to add sub images, channels, and scenes to your files",
    previous: TutorialStep.MASS_EDIT,
  },
};

interface Props {
  children: React.ReactNode;
  disabled?: boolean;
  step: TutorialStep;
}

export default function TutorialTooltip(props: Props) {
  const dispatch = useDispatch();
  const currentStep = useSelector(getTutorialStep);
  const showUploadHint = useSelector(getShowUploadHint);
  const { title, message, next, previous } = STEP_TO_INFO[props.step];

  const content = (
    <div className={styles.contentContainer}>
      <h4>Hint: {title}</h4>
      <p>{message}</p>
      <div className={styles.footer}>
        <div>
          <Button
            className={styles.footerButton}
            onClick={() => dispatch(updateSettings({ showUploadHint: false }))}
          >
            Disable upload hints
          </Button>
        </div>
        <div>
          <Button
            className={styles.footerButton}
            disabled={isNil(previous)}
            icon="caret-left"
            onClick={() => dispatch(setTutorialTooltipStep(previous))}
          />
          <Button
            className={styles.footerButton}
            icon="caret-right"
            onClick={() => dispatch(setTutorialTooltipStep(next))}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      placement="right"
      visible={currentStep === props.step && !props.disabled && showUploadHint}
    >
      {props.children}
    </Popover>
  );
}
